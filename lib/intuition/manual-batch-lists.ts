import type { Hex, PublicClient, WalletClient } from 'viem';

import {
  createActivityIntentBestEffort,
  enqueueActivityConfirmation,
  flushActivityOutbox,
} from '@/lib/activity/client';
import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { buildListReviewRows, isCreatableListReviewStatus } from '@/lib/intuition/list-duplicates';
import { INTUITION_CHAINS, getIntuitionNetwork } from '@/lib/intuition/networks';
import { HAS_TAG_PREDICATE_TERM_ID, prepareCreateTriplesTransaction } from '@/lib/intuition/tx-prepare';
import type { IntuitionAtomSearchResult, PublicIntuitionNetwork } from '@/types/api';
import type { ListMemberRow, ManualListReviewRow, PreparedListEntry } from '@/types/lists';
import type { WriteResult } from '@/types/writes';
import type { ActivitySourceFlow } from '@/types/activity';

interface ReviewManualBatchListsOptions {
  listAtom: IntuitionAtomSearchResult | null;
  rows: ListMemberRow[];
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
}

interface PublishManualBatchListsOptions {
  entries: PreparedListEntry[];
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
  walletClient: WalletClient;
  walletAddress: Hex;
  activityFlow?: ActivitySourceFlow;
}

function buildInvalidRow(row: ListMemberRow, errors: string[]): ManualListReviewRow {
  return {
    id: row.id,
    label: row.selectedAtom?.label ?? row.memberName.trim() ?? 'Unknown member',
    status: 'invalid',
    message: errors.join(' '),
    payload: {
      row,
      errors,
    },
  };
}

export async function reviewManualBatchLists({
  listAtom,
  rows,
  network,
  publicClient,
}: ReviewManualBatchListsOptions): Promise<ManualListReviewRow[]> {
  if (!listAtom) {
    throw new Error('Select a list atom before reviewing list entries.');
  }

  const tripleCost = (await publicClient.readContract({
    address: getIntuitionNetwork(network).multiVault,
    abi: MULTIVAULT_ABI,
    functionName: 'getTripleCost',
  })) as bigint;

  const invalidRows = new Map<string, ManualListReviewRow>();
  const validRows: ListMemberRow[] = [];

  for (const row of rows) {
    const errors: string[] = [];

    if (!row.memberName.trim()) {
      errors.push('Member search text is required.');
    }

    if (!row.selectedAtom) {
      errors.push('Select a member atom before reviewing this row.');
    }

    if (errors.length > 0) {
      invalidRows.set(row.id, buildInvalidRow(row, errors));
      continue;
    }

    validRows.push(row);
  }

  const preparedEntries: PreparedListEntry[] = [];

  for (const row of validRows) {
    const memberAtom = row.selectedAtom!;
    const tripleId = (await publicClient.readContract({
      address: getIntuitionNetwork(network).multiVault,
      abi: MULTIVAULT_ABI,
      functionName: 'calculateTripleId',
      args: [memberAtom.termId, HAS_TAG_PREDICATE_TERM_ID, listAtom.termId],
    })) as Hex;

    const alreadyExistsOnChain = (await publicClient.readContract({
      address: getIntuitionNetwork(network).multiVault,
      abi: MULTIVAULT_ABI,
      functionName: 'isTermCreated',
      args: [tripleId],
    })) as boolean;

    preparedEntries.push({
      id: row.id,
      listTermId: listAtom.termId,
      memberTermId: memberAtom.termId,
      tripleId,
      assetWei: tripleCost,
      alreadyExistsOnChain,
    });
  }

  const preparedRows = buildListReviewRows(validRows, preparedEntries).map<ManualListReviewRow>((row) => {
    const sourceRow = validRows.find((candidate) => candidate.id === row.id);

    return {
      ...row,
      payload: {
        row: sourceRow!,
        prepared: row.payload,
      },
    };
  });

  return rows.map((row) => invalidRows.get(row.id) ?? preparedRows.find((candidate) => candidate.id === row.id) ?? buildInvalidRow(row, ['Review data missing.']));
}

export function getCreatablePreparedListEntries(rows: ManualListReviewRow[]): PreparedListEntry[] {
  return rows
    .filter((row) => isCreatableListReviewStatus(row.status) && row.payload.prepared)
    .map((row) => row.payload.prepared as PreparedListEntry);
}

export async function publishManualBatchLists({
  entries,
  network,
  publicClient,
  walletClient,
  walletAddress,
  activityFlow,
}: PublishManualBatchListsOptions): Promise<WriteResult> {
  if (entries.length === 0) {
    return {
      kind: 'no_write_needed',
      createdIds: [],
      skippedIds: [],
    };
  }

  const preparedTransaction = prepareCreateTriplesTransaction(entries);
  const activityIntent = activityFlow
    ? await createActivityIntentBestEffort({
        network,
        sourceFlow: activityFlow,
        walletAddress,
        data: preparedTransaction.data,
      })
    : null;
  const txHash = await walletClient.sendTransaction({
    account: walletAddress,
    chain: INTUITION_CHAINS[network],
    to: getIntuitionNetwork(network).multiVault,
    data: preparedTransaction.data,
    value: preparedTransaction.value,
  });

  if (activityIntent) {
    enqueueActivityConfirmation({ intentId: activityIntent.intentId, network, txHash });
    void flushActivityOutbox();
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success') {
    throw new Error('The createTriples transaction was reverted on-chain. No list entries were confirmed as created.');
  }

  if (activityIntent) void flushActivityOutbox();

  return {
    kind: 'created',
    txHash,
    createdIds: entries.map((entry) => entry.tripleId),
    skippedIds: [],
  };
}
