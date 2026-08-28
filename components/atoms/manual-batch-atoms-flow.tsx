'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { FlowSteps } from '@/components/app/flow-steps';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { ClearFormButton } from '@/components/app/clear-form-button';
import { AtomDraftRowEditor } from '@/components/atoms/atom-draft-row-editor';
import { AtomReviewTable } from '@/components/atoms/atom-review-table';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { createEmptyAtomDraft } from '@/lib/intuition/atom-prepare';
import { getCreatablePreparedAtoms, publishManualBatchAtoms, reviewManualBatchAtoms } from '@/lib/intuition/manual-batch-atoms';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { createLocalId } from '@/lib/utils/ids';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { AtomDraft, ManualAtomReviewRow } from '@/types/atoms';
import type { WriteResult } from '@/types/writes';

function createDraft(seed = ''): AtomDraft {
  return {
    ...createEmptyAtomDraft(createLocalId('atom')),
    name: seed,
  };
}

type ManualAtomsFlowMode = 'single' | 'batch';

function getInitialDrafts(mode: ManualAtomsFlowMode): AtomDraft[] {
  return mode === 'batch' ? [createDraft(), createDraft()] : [createDraft()];
}

export function ManualBatchAtomsFlow({
  mode = 'single',
}: {
  mode?: ManualAtomsFlowMode;
}) {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();

  const [drafts, setDrafts] = useState<AtomDraft[]>(() => getInitialDrafts(mode));
  const [reviewRows, setReviewRows] = useState<ManualAtomReviewRow[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const networkConfig = getIntuitionNetwork(network);
  const publicClient = useMemo(() => createIntuitionPublicClient(network), [network]);
  const walletNetworkConfig = getIntuitionNetworkByChainId(chainId ?? null);
  const walletReady = accountStatus === 'connected' && !!address;
  const canWrite = walletReady && walletNetworkConfig?.key === network;
  const hasNetworkMismatch = walletReady && walletNetworkConfig?.key !== network;

  const creatableAtoms = useMemo(() => (reviewRows ? getCreatablePreparedAtoms(reviewRows) : []), [reviewRows]);
  const isSingleDraftMode = drafts.length === 1;
  const hasSingleEligibleAtom = creatableAtoms.length === 1;
  const isSingleMode = mode === 'single';
  const publishDisabledReason = getPublishDisabledReason({
    hasReview: !!reviewRows,
    eligibleCount: creatableAtoms.length,
    walletReady,
    hasNetworkMismatch,
    networkName: networkConfig.name,
    isBusy: isReviewing || isPublishing,
    subjectLabel: 'atom',
  });

  function patchDraft(id: string, patch: Partial<AtomDraft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    setReviewRows(null);
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function addDraft() {
    setDrafts((current) => [...current, createDraft()]);
    setReviewRows(null);
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function removeDraft(id: string) {
    setDrafts((current) => (current.length > 1 ? current.filter((draft) => draft.id !== id) : current));
    setReviewRows(null);
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function resetFlow(nextStatus?: string) {
    setDrafts(getInitialDrafts(mode));
    setReviewRows(null);
    setStatus(nextStatus ?? null);
    setError(null);
    setWriteResult(null);
    setIsReviewing(false);
    setIsPublishing(false);
  }

  async function handleReview() {
    setIsReviewing(true);
    setError(null);
    setWriteResult(null);
    setStatus('Validating drafts and preparing atom review...');

    try {
      const nextRows = await reviewManualBatchAtoms({
        drafts,
        network,
        publicClient,
      });

      setReviewRows(nextRows);
      setStatus(`Review ready. ${nextRows.filter((row) => row.status === 'ready_to_create').length} ${isSingleMode ? 'atom is' : 'atoms are'} ready to create.`);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setError(caughtError instanceof Error ? `Atom review failed: ${caughtError.message}` : 'Atom review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  async function handlePublish() {
    if (!reviewRows || creatableAtoms.length === 0) {
      setError(`Review the ${isSingleMode ? 'atom' : 'atoms'} before publishing.`);
      return;
    }

    if (!canWrite || !walletClient || !address) {
      setError(`Connect a wallet on ${networkConfig.name} before publishing ${isSingleMode ? 'this atom' : 'the batch'}.`);
      return;
    }

    setIsPublishing(true);
    setError(null);
    setStatus(`Waiting for wallet approval to create ${isSingleMode ? 'this atom' : 'the eligible atoms'}...`);
    setWriteResult(null);

    try {
      const result = await publishManualBatchAtoms({
        atoms: creatableAtoms,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: isSingleMode ? 'single_atom' : 'batch_atoms',
      });

      setWriteResult(result);
      setStatus(`${isSingleMode ? 'Atom' : 'Batch'} confirmed. ${result.createdIds.length} ${result.createdIds.length === 1 ? 'atom was' : 'atoms were'} created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `Atom publish failed: ${caughtError.message}` : 'Atom publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{isSingleMode ? 'Single atom' : 'Batch atoms'}</p>
              <h1 className="font-serif text-[2.6rem] leading-none tracking-[-0.05em] sm:text-[3.3rem]">
                {isSingleMode ? 'Create the atom you need first.' : 'Create several atoms in one reviewed pass.'}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted">
                {isSingleMode
                  ? 'Use the fastest lane for one atom at a time. If a matching atom already exists, review will catch it before you mint a duplicate.'
                  : 'Build up a reviewed atom batch, catch duplicates and existing atoms early, then send one `createAtoms` transaction for every eligible row.'}
              </p>
            </div>
          </div>

          <FlowSteps
            steps={
              isSingleMode
                ? [
                    { label: 'Add atom details', hint: 'Fill in the atom you want to create, including rich metadata if needed.' },
                    { label: 'Review atom', hint: 'Check validation and whether this atom already exists before anything is submitted.' },
                    { label: 'Publish atom', hint: 'Only a ready atom is included in the transaction.' },
                  ]
                : [
                    { label: 'Add atom rows', hint: 'Start with a small batch, then add more rows when you need them.' },
                    { label: 'Review atoms', hint: 'Check validation, duplicates, and existing atoms before anything is submitted.' },
                    { label: 'Publish eligible atoms', hint: 'Only rows marked ready to create are included in the transaction.' },
                  ]
            }
          />

          <div className="space-y-4">
            {drafts.map((draft, index) => (
              <AtomDraftRowEditor
                key={draft.id}
                draft={draft}
                index={index}
                disabled={isReviewing || isPublishing}
                onPatch={(patch) => patchDraft(draft.id, patch)}
                onRemove={() => removeDraft(draft.id)}
              />
            ))}
            <div className="flex justify-end">
              <ClearFormButton onClick={() => resetFlow()} disabled={isReviewing || isPublishing} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSingleMode ? null : (
              <button
                type="button"
                onClick={addDraft}
                disabled={isReviewing || isPublishing}
                className="inline-flex rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper transition-opacity duration-150 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-60"
              >
                + Add atom
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleReview();
              }}
              disabled={isReviewing || isPublishing}
              className="inline-flex rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewing ? `Reviewing ${isSingleMode ? 'atom' : 'atoms'}...` : `Review ${isSingleMode ? 'atom' : 'atoms'}`}
            </button>
          </div>

          {reviewRows ? <AtomReviewTable rows={reviewRows} nativeSymbol={networkConfig.nativeSymbol} /> : null}

          <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Review comes first. Only {isSingleMode ? 'a row marked `ready_to_create` is' : 'rows marked `ready_to_create` are'} included in the transaction.
                </p>
                <p className="text-sm leading-7 text-muted">
                  Eligible {isSingleDraftMode ? 'atoms' : 'rows'}: <span className="text-ink">{creatableAtoms.length}</span> /{' '}
                  {reviewRows?.length ?? 0}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={!reviewRows || creatableAtoms.length === 0 || !canWrite || isPublishing || isReviewing}
                className="inline-flex rounded-full border border-[#5d8a62] bg-[#edf6ee] px-5 py-3 text-sm text-[#1f5a2d] transition-colors duration-150 hover:bg-[#dbeedc] disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
              >
                {isPublishing
                  ? `Publishing ${hasSingleEligibleAtom ? 'atom' : isSingleMode ? 'atom' : 'batch'}...`
                  : hasNetworkMismatch
                    ? 'Wrong network'
                    : isSingleMode
                      ? 'Publish atom'
                      : `Publish eligible ${hasSingleEligibleAtom ? 'atom' : 'atoms'}`}
              </button>
              {writeResult?.txHash ? (
                <button
                  type="button"
                  onClick={() =>
                    resetFlow(
                      isSingleMode
                        ? 'Ready for the next atom.'
                        : 'Ready for the next batch.',
                    )
                  }
                  disabled={isReviewing || isPublishing}
                  className="inline-flex rounded-full border border-line bg-white/80 px-5 py-3 text-sm text-ink transition-colors duration-150 hover:border-ink/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSingleMode ? 'Create another atom' : 'Start new batch'}
                </button>
              ) : null}
            </div>

            {publishDisabledReason ? <p className="mt-4 text-sm leading-7 text-muted">{publishDisabledReason}</p> : null}

            {status ? <p className="mt-4 text-sm leading-7 text-muted">{status}</p> : null}
            {error ? <p className="mt-4 text-sm leading-7 text-[#8a4b38]">{error}</p> : null}

            {writeResult?.txHash ? (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/75 p-4">
                <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Transaction</p>
                <a
                  href={`${networkConfig.explorerUrl}/tx/${writeResult.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex break-all font-mono text-[0.78rem] leading-6 text-ink underline decoration-line underline-offset-4"
                >
                  {writeResult.txHash}
                </a>
              </div>
            ) : null}
          </div>
    </div>
  );
}
