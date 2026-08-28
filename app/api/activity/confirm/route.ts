import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  getAddress,
  http,
  isHash,
  keccak256,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Hex,
} from 'viem';

import { decodeActivityCalldata } from '@/lib/activity/calldata';
import {
  confirmActivity,
  countActivityItems,
  findActivityTransactionByHash,
  getActivityTransaction,
  markActivityExpired,
  markActivityPending,
  markActivityReverted,
} from '@/lib/activity/database';
import { parseCreatedActivityItems, verifyCreatedActivityItems } from '@/lib/activity/events';
import { getIntuitionNetwork, INTUITION_CHAINS } from '@/lib/intuition/networks';
import type { ActivityConfirmationRequest, ActivityConfirmationResponse } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNetwork(value: unknown): value is PublicIntuitionNetwork {
  return value === 'mainnet' || value === 'testnet';
}

function activityResponse(
  status: ActivityConfirmationResponse['status'],
  itemCount: number,
  retryable: boolean,
  httpStatus = 200,
) {
  return NextResponse.json({ status, itemCount, retryable } satisfies ActivityConfirmationResponse, { status: httpStatus });
}

export async function POST(request: NextRequest) {
  let body: Partial<ActivityConfirmationRequest>;

  try {
    body = (await request.json()) as Partial<ActivityConfirmationRequest>;
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
  }

  if (!body.intentId || !UUID_PATTERN.test(body.intentId) || !isNetwork(body.network)) {
    return NextResponse.json({ error: 'A valid activity intent and network are required.' }, { status: 400 });
  }

  if (typeof body.txHash !== 'string' || !isHash(body.txHash)) {
    return NextResponse.json({ error: 'A valid transaction hash is required.' }, { status: 400 });
  }

  try {
    const intent = await getActivityTransaction(body.intentId);

    if (!intent || intent.network !== body.network) {
      return NextResponse.json({ error: 'Activity intent was not found for this network.' }, { status: 404 });
    }

    if (intent.status === 'confirmed') {
      return activityResponse('confirmed', await countActivityItems(intent.id), false);
    }

    if (intent.status === 'reverted' || intent.status === 'expired') {
      return activityResponse(intent.status, 0, false);
    }

    if (intent.status === 'intent' && new Date(intent.expires_at).getTime() < Date.now()) {
      await markActivityExpired(intent.id);
      return activityResponse('expired', 0, false);
    }

    const existingTransaction = await findActivityTransactionByHash(intent.chain_id, body.txHash as Hex);

    if (existingTransaction && existingTransaction.id !== intent.id) {
      const sameVerifiedIntent =
        existingTransaction.expected_wallet.toLowerCase() === intent.expected_wallet.toLowerCase() &&
        existingTransaction.calldata_hash.toLowerCase() === intent.calldata_hash.toLowerCase();

      if (!sameVerifiedIntent) {
        return NextResponse.json({ error: 'This transaction hash belongs to another activity intent.' }, { status: 409 });
      }

      return activityResponse(
        existingTransaction.status,
        existingTransaction.status === 'confirmed' ? await countActivityItems(existingTransaction.id) : 0,
        existingTransaction.status === 'intent' || existingTransaction.status === 'pending',
        existingTransaction.status === 'intent' || existingTransaction.status === 'pending' ? 202 : 200,
      );
    }

    const networkConfig = getIntuitionNetwork(body.network);
    const publicClient = createPublicClient({
      chain: INTUITION_CHAINS[body.network],
      transport: http(networkConfig.rpcUrl),
    });
    const txHash = body.txHash as Hex;

    let transaction;

    try {
      transaction = await publicClient.getTransaction({ hash: txHash });
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        await markActivityPending(intent.id, txHash);
        return activityResponse('pending', 0, true, 202);
      }
      throw error;
    }

    if (
      !transaction.to ||
      transaction.to.toLowerCase() !== networkConfig.multiVault.toLowerCase() ||
      transaction.from.toLowerCase() !== intent.expected_wallet.toLowerCase() ||
      keccak256(transaction.input) !== intent.calldata_hash
    ) {
      return NextResponse.json({ error: 'The on-chain transaction does not match this activity intent.' }, { status: 422 });
    }

    const decoded = decodeActivityCalldata(transaction.input, intent.source_flow);

    if (
      decoded.operation !== intent.operation ||
      decoded.itemKind !== intent.item_kind ||
      decoded.itemCount !== intent.expected_item_count
    ) {
      return NextResponse.json({ error: 'The verified transaction payload differs from the stored activity intent.' }, { status: 422 });
    }

    await markActivityPending(intent.id, txHash);

    let receipt;

    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      if (error instanceof TransactionReceiptNotFoundError) {
        return activityResponse('pending', 0, true, 202);
      }
      throw error;
    }

    if (receipt.status === 'reverted') {
      await markActivityReverted(intent.id, txHash);
      return activityResponse('reverted', 0, false);
    }

    const items = parseCreatedActivityItems({
      logs: receipt.logs,
      multiVault: networkConfig.multiVault,
      itemKind: decoded.itemKind,
    });
    verifyCreatedActivityItems(items, decoded);

    if (items.some((item) => item.creatorWallet.toLowerCase() !== getAddress(transaction.from).toLowerCase())) {
      throw new Error('Creation event creator did not match the transaction sender.');
    }

    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
    const itemCount = await confirmActivity({
      id: intent.id,
      network: intent.network,
      chainId: intent.chain_id,
      txHash,
      creatorWallet: getAddress(transaction.from),
      blockNumber: receipt.blockNumber,
      blockTimestamp: new Date(Number(block.timestamp) * 1000),
      items,
    });

    return activityResponse('confirmed', itemCount, false);
  } catch (error) {
    console.error('[activity-confirm] Unable to verify activity transaction.', error);
    return NextResponse.json(
      { error: 'On-chain activity verification is temporarily unavailable.', retryable: true },
      { status: 503 },
    );
  }
}
