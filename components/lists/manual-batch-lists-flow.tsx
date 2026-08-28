'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { DisabledActionTooltip } from '@/components/app/disabled-action-tooltip';
import { FlowSteps } from '@/components/app/flow-steps';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { AtomSearchSelect } from '@/components/lists/atom-search-select';
import { ListMemberRowEditor } from '@/components/lists/list-member-row-editor';
import { ListReviewTable } from '@/components/lists/list-review-table';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import {
  getCreatablePreparedListEntries,
  publishManualBatchLists,
  reviewManualBatchLists,
} from '@/lib/intuition/manual-batch-lists';
import { createLocalId } from '@/lib/utils/ids';
import { getListReviewDisabledReason } from '@/lib/utils/list-review-state';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { IntuitionAtomSearchResult } from '@/types/api';
import type { ListMemberRow, ManualListReviewRow } from '@/types/lists';
import type { WriteResult } from '@/types/writes';

function createEmptyMemberRow(): ListMemberRow {
  return {
    id: createLocalId('list-member'),
    memberName: '',
    memberDescription: '',
    selectedAtom: null,
    candidates: [],
  };
}

export function ManualBatchListsFlow() {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();

  const [listQuery, setListQuery] = useState('');
  const [listAtom, setListAtom] = useState<IntuitionAtomSearchResult | null>(null);
  const [memberRows, setMemberRows] = useState<ListMemberRow[]>([createEmptyMemberRow(), createEmptyMemberRow()]);
  const [reviewRows, setReviewRows] = useState<ManualListReviewRow[] | null>(null);
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

  const creatableEntries = useMemo(
    () => (reviewRows ? getCreatablePreparedListEntries(reviewRows) : []),
    [reviewRows],
  );
  const hasSelectedMember = memberRows.some((row) => row.selectedAtom);
  const reviewDisabledReason = getListReviewDisabledReason({
    hasListAtom: !!listAtom,
    hasReviewableInput: hasSelectedMember,
    isBusy: isReviewing || isPublishing,
    missingInputMessage: 'Select at least one member atom before reviewing.',
  });
  const publishDisabledReason = getPublishDisabledReason({
    hasReview: !!reviewRows,
    eligibleCount: creatableEntries.length,
    walletReady,
    hasNetworkMismatch,
    networkName: networkConfig.name,
    isBusy: isReviewing || isPublishing,
    subjectLabel: 'list entry',
  });

  function resetReviewState() {
    setReviewRows(null);
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function patchMemberRow(id: string, patch: Partial<ListMemberRow>) {
    setMemberRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    resetReviewState();
  }

  function addMemberRow() {
    setMemberRows((current) => [...current, createEmptyMemberRow()]);
    resetReviewState();
  }

  function removeMemberRow(id: string) {
    setMemberRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
    resetReviewState();
  }

  async function handleReview() {
    if (!listAtom) {
      setError('Select an existing list atom before reviewing entries.');
      return;
    }

    if (!hasSelectedMember) {
      setError('Select at least one member atom before reviewing the batch.');
      return;
    }

    setIsReviewing(true);
    setError(null);
    setWriteResult(null);
    setStatus('Preparing list entry review...');

    try {
      const nextRows = await reviewManualBatchLists({
        listAtom,
        rows: memberRows,
        network,
        publicClient,
      });

      setReviewRows(nextRows);
      setStatus(`Review ready. ${getCreatablePreparedListEntries(nextRows).length} list entries can be created.`);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setError(caughtError instanceof Error ? `List review failed: ${caughtError.message}` : 'List review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  async function handlePublish() {
    if (!reviewRows || creatableEntries.length === 0) {
      setError('Review the list batch before publishing.');
      return;
    }

    if (!canWrite || !walletClient || !address) {
      setError(`Connect a wallet on ${networkConfig.name} before publishing the batch.`);
      return;
    }

    setIsPublishing(true);
    setError(null);
    setWriteResult(null);
    setStatus('Waiting for wallet approval to create the eligible list entries...');

    try {
      const result = await publishManualBatchLists({
        entries: creatableEntries,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: 'manual_lists',
      });

      setWriteResult(result);
      setStatus(`Batch confirmed. ${result.createdIds.length} list entries were created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `List publish failed: ${caughtError.message}` : 'List publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Manual lists</p>
              <h1 className="font-serif text-[2.6rem] leading-none tracking-[-0.05em] sm:text-[3.3rem]">
                Add existing member atoms to an existing list with review before publish.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted">
                Select an existing list atom, choose one or more existing member atoms, review duplicates and existing
                entries, then publish only the missing list entries in one transaction.
              </p>
            </div>
          </div>

          <FlowSteps
            steps={[
              { label: 'Choose a list', hint: 'Select the existing list atom you want to add members to.' },
              { label: 'Add members', hint: 'Search for one or more existing atoms to include in this list update.' },
              { label: 'Review list entries', hint: 'See which entries are new, already present, duplicated, or incomplete.' },
              { label: 'Publish missing entries', hint: 'Only missing list entries are sent in the transaction.' },
            ]}
          />

          <AtomSearchSelect
            label="List atom"
            network={network}
            preferredCreatorAddress={address ?? null}
            selectedAtom={listAtom}
            query={listQuery}
            placeholder="Search an existing list atom"
            disabled={isReviewing || isPublishing}
            helperText="Start typing to search automatically. If the list atom does not exist yet, create it first and it will be selected here."
            allowCreate
            createLabel="list atom"
            onQueryChange={(value) => {
              setListQuery(value);
              if (listAtom?.label !== value) {
                setListAtom(null);
              }
              resetReviewState();
            }}
            onSelect={(atom) => {
              setListAtom(atom);
              setListQuery(atom.label);
              resetReviewState();
            }}
            onClear={() => {
              setListAtom(null);
              setListQuery('');
              resetReviewState();
            }}
          />

          <div className="space-y-4">
            {memberRows.map((row, index) => (
              <ListMemberRowEditor
                key={row.id}
                row={row}
                index={index}
                network={network}
                preferredCreatorAddress={address ?? null}
                disabled={isReviewing || isPublishing}
                onPatch={(patch) => patchMemberRow(row.id, patch)}
                onRemove={() => removeMemberRow(row.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addMemberRow}
              disabled={isReviewing || isPublishing}
              className="inline-flex rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper transition-opacity duration-150 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add member
            </button>
            <DisabledActionTooltip reason={reviewDisabledReason}>
              <button
                type="button"
                onClick={() => {
                  void handleReview();
                }}
                disabled={!!reviewDisabledReason}
                className="inline-flex rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReviewing ? 'Reviewing list entries...' : 'Review list entries'}
              </button>
            </DisabledActionTooltip>
          </div>

          {reviewRows ? <ListReviewTable rows={reviewRows} nativeSymbol={networkConfig.nativeSymbol} /> : null}

          <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Review comes first. Only rows marked `ready_to_create` or `ready_with_matches` are included in the
                  transaction.
                </p>
                <p className="text-sm leading-7 text-muted">
                  Eligible rows: <span className="text-ink">{creatableEntries.length}</span> / {reviewRows?.length ?? 0}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={!reviewRows || creatableEntries.length === 0 || !canWrite || isPublishing || isReviewing}
                className="inline-flex rounded-full border border-ink px-5 py-3 text-sm text-ink transition-colors duration-150 hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? 'Publishing batch...' : hasNetworkMismatch ? 'Wrong network' : 'Publish eligible list entries'}
              </button>
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
