import type { Hex, PublicClient, WalletClient } from 'viem';

import {
  createActivityIntentBestEffort,
  enqueueActivityConfirmation,
  flushActivityOutbox,
} from '@/lib/activity/client';
import { getIntuitionNetwork, INTUITION_CHAINS } from '@/lib/intuition/networks';
import { prepareAtomDraft, validateAtomDraft } from '@/lib/intuition/atom-prepare';
import { buildAtomReviewRows } from '@/lib/intuition/atom-duplicates';
import { pinRichMetadata } from '@/lib/intuition/pin-metadata-client';
import { prepareCreateAtomsTransaction } from '@/lib/intuition/tx-prepare';
import type { AtomDraft, AtomReviewRow, PreparedAtomDraft } from '@/types/atoms';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { WriteResult } from '@/types/writes';
import type { ActivitySourceFlow } from '@/types/activity';

interface ReviewAtomDraftBatchOptions {
  drafts: AtomDraft[];
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
  draftErrorsById?: Map<string, string[]>;
}

interface PublishManualBatchAtomsOptions {
  atoms: PreparedAtomDraft[];
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
  walletClient: WalletClient;
  walletAddress: Hex;
  activityFlow?: ActivitySourceFlow;
}

interface CreateSingleAtomOptions {
  draft: AtomDraft;
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
  walletClient: WalletClient;
  walletAddress: Hex;
}

function buildInvalidRow(draft: AtomDraft, errors: string[]): AtomReviewRow {
  return {
    id: draft.id,
    label: draft.name.trim() || draft.accountAddress.trim() || draft.rawData.trim() || 'Untitled atom',
    status: 'invalid',
    message: errors.join(' '),
    payload: {
      draft,
      errors,
    },
  };
}

export async function reviewManualBatchAtoms({
  drafts,
  network,
  publicClient,
}: ReviewAtomDraftBatchOptions): Promise<AtomReviewRow[]> {
  return reviewAtomDraftBatch({ drafts, network, publicClient });
}

export async function reviewAtomDraftBatch({
  drafts,
  network,
  publicClient,
  draftErrorsById = new Map(),
}: ReviewAtomDraftBatchOptions): Promise<AtomReviewRow[]> {
  const invalidRows = new Map<string, AtomReviewRow>();
  const validDrafts: AtomDraft[] = [];

  for (const draft of drafts) {
    const errors = [...(draftErrorsById.get(draft.id) ?? []), ...validateAtomDraft(draft)];

    if (errors.length > 0) {
      invalidRows.set(draft.id, buildInvalidRow(draft, errors));
      continue;
    }

    validDrafts.push(draft);
  }

  const preparedDrafts: PreparedAtomDraft[] = [];

  for (const draft of validDrafts) {
    const prepared = await prepareAtomDraft(draft, network, publicClient, pinRichMetadata);
    preparedDrafts.push(prepared);
  }

  const preparedRows = buildAtomReviewRows(validDrafts, preparedDrafts).map<AtomReviewRow>((row) => {
    const sourceDraft = validDrafts.find((draft) => draft.id === row.id);

    return {
      ...row,
      payload: {
        draft: sourceDraft!,
        prepared: row.payload,
      },
    };
  });

  return drafts.map((draft) => {
    return invalidRows.get(draft.id) ?? preparedRows.find((row) => row.id === draft.id) ?? buildInvalidRow(draft, ['Review data missing.']);
  });
}

export function getCreatablePreparedAtoms(rows: AtomReviewRow[]): PreparedAtomDraft[] {
  return rows
    .filter((row) => row.status === 'ready_to_create' && row.payload.prepared)
    .map((row) => row.payload.prepared as PreparedAtomDraft);
}

export async function publishManualBatchAtoms({
  atoms,
  network,
  publicClient,
  walletClient,
  walletAddress,
  activityFlow,
}: PublishManualBatchAtomsOptions): Promise<WriteResult> {
  if (atoms.length === 0) {
    return {
      kind: 'no_write_needed',
      createdIds: [],
      skippedIds: [],
    };
  }

  const preparedTransaction = prepareCreateAtomsTransaction(atoms);
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
    throw new Error('The createAtoms transaction was reverted on-chain. No atoms were confirmed as created.');
  }

  if (activityIntent) void flushActivityOutbox();

  return {
    kind: 'created',
    txHash,
    createdIds: atoms.map((atom) => atom.atomId),
    skippedIds: [],
  };
}

export async function createSingleAtom({
  draft,
  network,
  publicClient,
  walletClient,
  walletAddress,
}: CreateSingleAtomOptions): Promise<{
  prepared: PreparedAtomDraft;
  writeResult: WriteResult;
}> {
  const errors = validateAtomDraft(draft);

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const prepared = await prepareAtomDraft(draft, network, publicClient, pinRichMetadata);

  if (prepared.existsOnChain) {
    return {
      prepared,
      writeResult: {
        kind: 'skipped',
        createdIds: [],
        skippedIds: [prepared.atomId],
      },
    };
  }

  const writeResult = await publishManualBatchAtoms({
    atoms: [prepared],
    network,
    publicClient,
    walletClient,
    walletAddress,
    activityFlow: 'inline_atom',
  });

  return {
    prepared,
    writeResult,
  };
}
