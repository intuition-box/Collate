import { randomUUID } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress, isHex, keccak256, type Hex } from 'viem';

import { decodeActivityCalldata } from '@/lib/activity/calldata';
import { createActivityIntent } from '@/lib/activity/database';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { ACTIVITY_SOURCE_FLOWS, type ActivityIntentRequest, type ActivitySourceFlow } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTENT_LIFETIME_MS = 24 * 60 * 60 * 1000;

function isNetwork(value: unknown): value is PublicIntuitionNetwork {
  return value === 'mainnet' || value === 'testnet';
}

function isSourceFlow(value: unknown): value is ActivitySourceFlow {
  return typeof value === 'string' && ACTIVITY_SOURCE_FLOWS.includes(value as ActivitySourceFlow);
}

export async function POST(request: NextRequest) {
  let body: Partial<ActivityIntentRequest>;

  try {
    body = (await request.json()) as Partial<ActivityIntentRequest>;
  } catch {
    return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
  }

  if (!isNetwork(body.network) || !isSourceFlow(body.sourceFlow)) {
    return NextResponse.json({ error: 'Unsupported activity network or source flow.' }, { status: 400 });
  }

  if (typeof body.walletAddress !== 'string' || !isAddress(body.walletAddress)) {
    return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400 });
  }

  if (typeof body.data !== 'string' || !isHex(body.data)) {
    return NextResponse.json({ error: 'Valid transaction calldata is required.' }, { status: 400 });
  }

  let decoded;

  try {
    decoded = decodeActivityCalldata(body.data as Hex, body.sourceFlow);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unsupported activity calldata.' },
      { status: 400 },
    );
  }

  try {
    const networkConfig = getIntuitionNetwork(body.network);
    const intentId = randomUUID();
    const expiresAt = new Date(Date.now() + INTENT_LIFETIME_MS);

    await createActivityIntent({
      id: intentId,
      network: body.network,
      chainId: networkConfig.chainId,
      sourceFlow: body.sourceFlow,
      itemKind: decoded.itemKind,
      operation: decoded.operation,
      expectedItemCount: decoded.itemCount,
      expectedWallet: getAddress(body.walletAddress),
      calldataHash: keccak256(body.data as Hex),
      expiresAt,
    });

    return NextResponse.json({ intentId, expiresAt: expiresAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error('[activity-intent] Unable to store activity intent.', error);
    return NextResponse.json({ error: 'Activity tracking is temporarily unavailable.' }, { status: 503 });
  }
}
