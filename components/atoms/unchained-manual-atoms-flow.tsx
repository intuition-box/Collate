'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { ClearFormButton } from '@/components/app/clear-form-button';
import { FlowSteps } from '@/components/app/flow-steps';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { UnchainedAtomReviewTable } from '@/components/atoms/unchained-atom-review-table';
import { UnchainedManualAtomEditor } from '@/components/atoms/unchained-manual-atom-editor';
import { publishManualBatchAtoms } from '@/lib/intuition/manual-batch-atoms';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getCreatableUnchainedAtoms, reviewUnchainedAtoms } from '@/lib/intuition/unchained-csv-atoms';
import { createUnchainedManualAtomDraft, prepareUnchainedManualAtom } from '@/lib/intuition/unchained-manual-atoms';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { UnchainedAtomReviewRow, UnchainedManualAtomDraft } from '@/types/atoms';
import type { WriteResult } from '@/types/writes';

type Mode = 'single' | 'batch';

function initialDrafts(mode: Mode): UnchainedManualAtomDraft[] {
  return mode === 'batch'
    ? [createUnchainedManualAtomDraft(), createUnchainedManualAtomDraft()]
    : [createUnchainedManualAtomDraft()];
}

export function UnchainedManualAtomsFlow({ mode, active = true }: { mode: Mode; active?: boolean }) {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();
  const [drafts, setDrafts] = useState<UnchainedManualAtomDraft[]>(() => initialDrafts(mode));
  const [reviewRows, setReviewRows] = useState<UnchainedAtomReviewRow[] | null>(null);
  const [approvedMatchIds, setApprovedMatchIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const isSingle = mode === 'single';
  const publicClient = useMemo(() => createIntuitionPublicClient(network), [network]);
  const networkConfig = getIntuitionNetwork(network);
  const walletNetwork = getIntuitionNetworkByChainId(chainId ?? null);
  const walletReady = accountStatus === 'connected' && !!address;
  const hasNetworkMismatch = walletReady && walletNetwork?.key !== network;
  const canWrite = walletReady && !hasNetworkMismatch && network === 'testnet';
  const eligible = reviewRows ? getCreatableUnchainedAtoms(reviewRows) : [];
  const disabledReason = network === 'mainnet'
    ? 'Canonical Unchained publishing is available on Testnet while graph display is being verified. Switch to Testnet, or use Classic creation on Mainnet.'
    : getPublishDisabledReason({
        hasReview: !!reviewRows,
        eligibleCount: eligible.length,
        walletReady,
        hasNetworkMismatch,
        networkName: networkConfig.name,
        isBusy: isReviewing || isPublishing,
        subjectLabel: isSingle ? 'atom' : 'atom batch',
      });

  function clearReview() {
    setReviewRows(null);
    setApprovedMatchIds(new Set());
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function patchDraft(id: string, patch: Partial<UnchainedManualAtomDraft>) {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
    clearReview();
  }

  function resetFlow(message?: string) {
    setDrafts(initialDrafts(mode));
    clearReview();
    setStatus(message ?? null);
  }

  function addDraft() {
    setDrafts((current) => [...current, createUnchainedManualAtomDraft()]);
    clearReview();
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.length > 1 ? current.filter((draft) => draft.id !== id) : current);
    clearReview();
  }

  async function review() {
    setIsReviewing(true);
    setReviewRows(null);
    setError(null);
    setWriteResult(null);
    setStatus('Validating canonical fields and checking the selected network...');

    try {
      const rows = drafts.map(prepareUnchainedManualAtom);
      const reviewed = await reviewUnchainedAtoms({ rows, network, publicClient, approvedMatchIds });
      const ready = reviewed.filter((row) => row.status === 'ready_to_create').length;
      setReviewRows(reviewed);
      setStatus(`Review ready. ${ready} ${ready === 1 ? 'atom is' : 'atoms are'} eligible to create.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `Atom review failed: ${caughtError.message}` : 'Atom review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  function approveDistinct(id: string) {
    setApprovedMatchIds((current) => new Set(current).add(id));
    setReviewRows(null);
    setStatus('Choice recorded. Review again to refresh the eligible atoms.');
  }

  async function publish() {
    if (!reviewRows || !eligible.length) {
      setError(`Review ${isSingle ? 'the atom' : 'the batch'} before publishing.`);
      return;
    }
    if (network !== 'testnet') {
      setError('Canonical Unchained publishing is currently available on Testnet. Use Classic creation on Mainnet.');
      return;
    }
    if (!canWrite || !walletClient || !address) {
      setError(`Connect a wallet on ${networkConfig.name} before publishing.`);
      return;
    }

    setIsPublishing(true);
    setError(null);
    setStatus('Waiting for wallet approval...');
    try {
      const result = await publishManualBatchAtoms({
        atoms: eligible,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: isSingle ? 'single_atom' : 'batch_atoms',
      });
      setWriteResult(result);
      setStatus(`Transaction confirmed. ${result.createdIds.length} canonical ${result.createdIds.length === 1 ? 'atom was' : 'atoms were'} created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `Atom publish failed: ${caughtError.message}` : 'Atom publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-terminal text-muted">{isSingle ? 'Single canonical atom' : 'Canonical atom batch'}</p>
        <h1 className="max-w-3xl font-serif text-4xl tracking-tight text-ink sm:text-5xl">
          {isSingle ? 'Create one precisely typed atom.' : 'Create several precisely typed atoms.'}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted">
          Choose from all 37 Unchained types. Each type exposes its exact canonical fields, then review checks IDs, existing atoms, and same-name matches before publishing.
        </p>
      </div>

      <FlowSteps steps={[
        { label: isSingle ? 'Choose a type' : 'Prepare atoms', hint: isSingle ? 'Choose the primitive and fill its required canonical fields.' : 'Each row can use a different primitive and field shape.' },
        { label: isSingle ? 'Review atom' : 'Review atoms', hint: 'Validate canonical IDs, duplicates, existing atoms, and same-name matches.' },
        { label: 'Publish', hint: `Only ${isSingle ? 'the eligible atom enters' : 'eligible atoms enter'} one wallet transaction.` },
      ]} />

      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <UnchainedManualAtomEditor
            key={draft.id}
            draft={draft}
            index={index}
            active={active}
            disabled={isReviewing || isPublishing}
            hideRemoveButton={isSingle || drafts.length === 1}
            onPatch={(patch) => patchDraft(draft.id, patch)}
            onRemove={() => removeDraft(draft.id)}
          />
        ))}
        <div className="flex justify-end"><ClearFormButton onClick={() => resetFlow()} disabled={isReviewing || isPublishing} /></div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isSingle ? null : (
          <button type="button" onClick={addDraft} disabled={isReviewing || isPublishing} className="rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60">
            + Add atom
          </button>
        )}
        <button type="button" onClick={() => { void review(); }} disabled={isReviewing || isPublishing} className="rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-ink disabled:opacity-60">
          {isReviewing ? `Reviewing ${isSingle ? 'atom' : 'atoms'}...` : `Review ${isSingle ? 'atom' : 'atoms'}`}
        </button>
      </div>

      {reviewRows ? <UnchainedAtomReviewTable rows={reviewRows} nativeSymbol={networkConfig.nativeSymbol} onApproveDistinct={approveDistinct} /> : null}

      <div className="rounded-xl border border-line/80 bg-paper/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 text-sm leading-6 text-muted">
            <p className="text-xs uppercase tracking-terminal">Publish</p>
            <p>Review comes first. Only atoms marked `ready_to_create` enter the transaction.</p>
            <p>Eligible atoms: <span className="text-ink">{eligible.length}</span> / {reviewRows?.length ?? 0}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { void publish(); }}
              disabled={!reviewRows || !eligible.length || !canWrite || isReviewing || isPublishing || !!writeResult}
              className="rounded-full border border-[#5d8a62] bg-[#edf6ee] px-5 py-3 text-sm text-[#1f5a2d] disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
            >
              {isPublishing ? 'Publishing...' : writeResult ? 'Published' : isSingle ? 'Publish atom' : 'Publish eligible atoms'}
            </button>
            {writeResult?.txHash ? (
              <button type="button" onClick={() => resetFlow(isSingle ? 'Ready for the next atom.' : 'Ready for the next batch.')} className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm text-ink">
                {isSingle ? 'Create another atom' : 'Start new batch'}
              </button>
            ) : null}
          </div>
        </div>
        {disabledReason && !writeResult ? <p className="mt-3 text-sm leading-6 text-muted">{disabledReason}</p> : null}
        {status ? <p className="mt-3 text-sm leading-6 text-muted">{status}</p> : null}
        {error ? <p className="mt-3 text-sm leading-6 text-[#8a4b38]">{error}</p> : null}
        {writeResult?.txHash ? (
          <a href={`${networkConfig.explorerUrl}/tx/${writeResult.txHash}`} target="_blank" rel="noreferrer" className="mt-3 block break-all font-mono text-xs text-ink underline underline-offset-4">
            View transaction: {writeResult.txHash}
          </a>
        ) : null}
      </div>
    </div>
  );
}
