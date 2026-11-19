'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { DisabledActionTooltip } from '@/components/app/disabled-action-tooltip';
import { CsvReviewLoadingPanel, CsvReviewPrompt, CsvWorkflowProgress, useCsvReviewNavigation } from '@/components/app/csv-workflow';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { ErrorNotice } from '@/components/app/error-notice';
import { usePublishToast } from '@/components/app/publish-toast-provider';
import { useCreationLimits } from '@/components/app/use-creation-limits';
import { TransactionExplorerLink } from '@/components/app/transaction-explorer-link';
import { ClearFormButton } from '@/components/app/clear-form-button';
import { AtomSearchSelect } from '@/components/lists/atom-search-select';
import { CsvListPreviewTable } from '@/components/lists/csv-list-preview-table';
import { ListReviewTable } from '@/components/lists/list-review-table';
import { parseCsvListText } from '@/lib/csv/list-csv';
import { downloadListCsvTemplate } from '@/lib/csv/templates';
import { resolveCsvListRows, reviewCsvBatchLists } from '@/lib/intuition/csv-batch-lists';
import {
  getCreatablePreparedListEntries,
  publishManualBatchLists,
} from '@/lib/intuition/manual-batch-lists';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getListReviewDisabledReason } from '@/lib/utils/list-review-state';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import { getCsvWorkflowStage } from '@/lib/utils/csv-workflow-state';
import type { IntuitionAtomSearchResult } from '@/types/api';
import type { CsvListParseRow, ManualListReviewRow } from '@/types/lists';
import type { WriteResult } from '@/types/writes';

const DEFAULT_CSV_TEXT = ['member,description,deposit', 'Ethereum,Layer one,0', 'Base,Layer two,0'].join('\n');

export function CsvBatchListsFlow() {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();
  const showConfirmedPublish = usePublishToast();
  const { limits, isPending: limitsPending, isError: limitsError } = useCreationLimits(address);
  const listLimit = limits.listLimit;

  const [listQuery, setListQuery] = useState('');
  const [listAtom, setListAtom] = useState<IntuitionAtomSearchResult | null>(null);
  const [csvText, setCsvText] = useState(DEFAULT_CSV_TEXT);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvListParseRow[] | null>(null);
  const [previewLimit, setPreviewLimit] = useState<number | null>(null);
  const [reviewRows, setReviewRows] = useState<ManualListReviewRow[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const { reviewRef, navigateToReview, showReview } = useCsvReviewNavigation(isReviewing, reviewRows !== null, reviewError !== null);

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
  const reviewDisabledReason = getListReviewDisabledReason({
    hasListAtom: !!listAtom,
    hasReviewableInput: !!parsedRows?.length,
    isBusy: isParsing || isReviewing || isPublishing,
    missingInputMessage: 'Preview at least one CSV row before reviewing.',
  });
  const limitChanged = previewLimit !== null && previewLimit !== listLimit;
  const workflowStage = getCsvWorkflowStage({
    hasPreview: parsedRows !== null,
    isReviewing,
    hasReview: reviewRows !== null,
    reviewStarted,
    reviewFailed: reviewError !== null,
  });
  const publishDisabledReason = limitsError ? 'Batch limits are unavailable. Refresh this page before publishing.' : limitsPending ? 'Loading batch limits. Please wait before publishing.' : limitChanged ? `Your list-entry limit changed to ${listLimit}. Preview the CSV again before publishing.` : getPublishDisabledReason({
    hasReview: !!reviewRows,
    eligibleCount: creatableEntries.length,
    walletReady,
    hasNetworkMismatch,
    networkName: networkConfig.name,
    isBusy: isParsing || isReviewing || isPublishing,
    subjectLabel: 'CSV list',
  });

  function resetDownstreamState() {
    setParsedRows(null);
    setPreviewLimit(null);
    setReviewRows(null);
    setReviewStarted(false);
    setStatus(null);
    setPreviewError(null);
    setPublishError(null);
    setReviewError(null);
    setWriteResult(null);
  }

  function resetFlow() {
    setListQuery('');
    setListAtom(null);
    setCsvText('');
    setFileName(null);
    setFileInputKey((current) => current + 1);
    resetDownstreamState();
    setStatus('CSV list form cleared. Choose a list atom, then paste CSV text or upload a file to start again.');
  }

  async function handleCsvFileChange(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const nextText = await file.text();
      setFileName(file.name);
      setCsvText(nextText);
      resetDownstreamState();
      setStatus(`Loaded ${file.name}. Preview the parsed rows before review.`);
    } catch (caughtError) {
      setStatus(null);
      setPreviewError(caughtError instanceof Error ? `CSV list file read failed: ${caughtError.message}` : 'CSV list file read failed.');
    }
  }

  function handlePreview() {
    if (limitsPending || limitsError) {
      setPreviewError('Batch limits are unavailable. Try previewing again shortly.');
      return;
    }
    setIsParsing(true);
    setPreviewError(null);
    setPublishError(null);
    setReviewError(null);
    setReviewStarted(false);
    setStatus('Parsing CSV rows...');
    setWriteResult(null);
    setReviewRows(null);

    try {
      const result = parseCsvListText(csvText, listLimit);
      setPreviewLimit(listLimit);
      setParsedRows(result.parsedRows);
      setStatus(
        result.parsedRows.length === 0 ? 'No CSV rows were parsed.' : `Parsed ${result.parsedRows.length} list rows. Continue to review for resolution and duplicate checks.`,
      );
    } catch (caughtError) {
      setParsedRows(null);
      setStatus(null);
      setPreviewError(caughtError instanceof Error ? `CSV list parsing failed: ${caughtError.message}` : 'CSV list parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleReview() {
    navigateToReview();
    if (limitChanged) {
      setReviewError(`Your list-entry limit changed to ${listLimit}. Preview the CSV again before reviewing.`);
      return;
    }
    if (!listAtom) {
      setReviewError('Select an existing list atom before reviewing CSV rows.');
      return;
    }

    if (!parsedRows || parsedRows.length === 0) {
      setReviewError('Preview the CSV before reviewing it.');
      return;
    }

    setIsReviewing(true);
    setReviewStarted(true);
    setReviewRows(null);
    setPreviewError(null);
    setPublishError(null);
    setReviewError(null);
    setWriteResult(null);
    setStatus(null);

    try {
      const resolvedRows = await resolveCsvListRows({
        rows: parsedRows.map((entry) => entry.row),
        network,
        preferredCreatorAddress: address ?? null,
      });

      const mergedParsedRows = parsedRows.map((entry) => ({
        ...entry,
        row: resolvedRows.find((resolved) => resolved.id === entry.row.id) ?? entry.row,
      }));

      const nextRows = await reviewCsvBatchLists({
        listAtom,
        parsedRows: mergedParsedRows,
        network,
        publicClient,
      });

      setParsedRows(mergedParsedRows);
      setReviewRows(nextRows);
      setStatus(null);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setReviewError(caughtError instanceof Error ? `CSV list review failed: ${caughtError.message}` : 'CSV list review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  function patchParsedRow(rowId: string, updater: (entry: CsvListParseRow) => CsvListParseRow) {
    setParsedRows((current) => current?.map((entry) => (entry.row.id === rowId ? updater(entry) : entry)) ?? null);
    setReviewRows(null);
    setStatus('Row updated. Review the batch again to refresh statuses.');
    setPreviewError(null);
    setPublishError(null);
    setReviewError(null);
    setWriteResult(null);
  }

  function removeParsedRow(rowId: string) {
    setParsedRows((current) => current?.filter((entry) => entry.row.id !== rowId) ?? null);
    setReviewRows((current) => current?.filter((entry) => entry.id !== rowId) ?? null);
    setStatus('Row removed. Review the batch again if needed.');
    setPreviewError(null);
    setPublishError(null);
    setReviewError(null);
    setWriteResult(null);
  }

  async function handlePublish() {
    if (limitsPending || limitsError || limitChanged) {
      setPublishError(publishDisabledReason ?? 'Batch limits are unavailable. Try again.');
      return;
    }
    if (!reviewRows || creatableEntries.length === 0) {
      setPublishError('Review the CSV list batch before publishing.');
      return;
    }

    if (!canWrite || !walletClient || !address) {
      setPublishError(`Connect a wallet on ${networkConfig.name} before publishing the batch.`);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setWriteResult(null);
    setStatus('Checking limits before requesting wallet approval for the eligible list entries...');

    try {
      const result = await publishManualBatchLists({
        entries: creatableEntries,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: 'csv_lists',
        limit: listLimit,
      });

      setWriteResult(result);
      setStatus(`CSV batch confirmed. ${result.createdIds.length} list entries were created on ${networkConfig.name}.`);
      showConfirmedPublish({ result, kind: 'list_entry', network });
    } catch (caughtError) {
      setStatus(null);
      setPublishError(caughtError instanceof Error ? `CSV list publish failed: ${caughtError.message}` : 'CSV list publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">CSV batch lists</p>
              <h1 className="font-serif text-[2.6rem] leading-none tracking-[-0.05em] sm:text-[3.3rem]">
                Import list members from CSV and resolve them before publish.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted">
                Select an existing list atom, then import member names and descriptions copied from atoms that already
                exist on the selected network. Collate resolves those atoms before publishing the missing list entries.
              </p>
              <p className="max-w-3xl text-sm leading-7 text-muted">
                The optional <code className="text-ink">deposit</code> column adds extra TRUST on top of each required
                list entry cost. Leave it blank or use <code className="text-ink">0</code> to add no extra support.
              </p>
            </div>
          </div>

          <CsvWorkflowProgress activeStage={workflowStage} finished={!!writeResult} />

          <section aria-labelledby="prepare-lists-title" className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-terminal text-muted">Prepare</p>
              <h2 id="prepare-lists-title" className="text-xl font-medium text-ink">Choose a list and prepare your CSV</h2>
            </div>

          <AtomSearchSelect
            label="List atom"
            network={network}
            preferredCreatorAddress={address ?? null}
            selectedAtom={listAtom}
            query={listQuery}
            placeholder="Search an existing list atom"
            disabled={isParsing || isReviewing || isPublishing}
            helperText="Start typing to search automatically. If the list atom does not exist yet, create it first and it will be selected here."
            allowCreate
            createLabel="list atom"
            onQueryChange={(value) => {
              setListQuery(value);
              if (listAtom?.label !== value) {
                setListAtom(null);
              }
              resetDownstreamState();
            }}
            onSelect={(atom) => {
              setListAtom(atom);
              setListQuery(atom.label);
              resetDownstreamState();
            }}
            onClear={() => {
              setListAtom(null);
              setListQuery('');
              resetDownstreamState();
            }}
          />

          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
            <div className="flex h-full flex-col rounded-[1.15rem] border border-line/80 bg-paper/65 p-5">
              <label className="flex min-h-0 flex-1 flex-col gap-3">
                <span className="text-[0.72rem] uppercase tracking-terminal text-muted">Paste CSV text</span>
                <textarea
                  value={csvText}
                  disabled={isReviewing || isPublishing}
                  onChange={(event) => {
                    setCsvText(event.target.value);
                    resetDownstreamState();
                  }}
                  rows={12}
                  className="min-h-[24rem] w-full flex-1 resize-y rounded-xl border border-line/80 bg-white/70 px-4 py-4 font-mono text-sm leading-7 text-ink outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="member,description,deposit"
                />
              </label>
            </div>

            <div className="space-y-4 rounded-[1.15rem] border border-line/80 bg-paper/65 p-5">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">CSV source</p>
                <div className="flex flex-wrap gap-2">
                  <label className={`inline-flex rounded-full border border-line bg-white/85 px-4 py-2 text-sm text-ink ${isReviewing || isPublishing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".csv,text/csv"
                      disabled={isReviewing || isPublishing}
                      className="sr-only"
                      onChange={(event) => {
                        void handleCsvFileChange(event.target.files?.[0] ?? null);
                      }}
                    />
                    Upload CSV file
                  </label>
                  <button
                    type="button"
                    onClick={downloadListCsvTemplate}
                    className="inline-flex rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink"
                  >
                    Download sample
                  </button>
                </div>
                <p className="text-sm leading-7 text-muted">{fileName ? `Loaded file: ${fileName}` : 'You can upload a file or paste CSV text.'}</p>
              </div>

              <div className="space-y-2 text-sm leading-7 text-muted">
                <p>Supported headers include `member`, `name`, `atom`, `label`, `subject`, and `description`.</p>
                <p>Exact single-name matches auto-resolve. Ambiguous rows require manual selection. Missing rows stay blocked until removed.</p>
              </div>

              <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
                <p className="text-xs uppercase tracking-terminal text-ink">Matching rule</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Copy the exact name and exact description from an atom that already exists on this network. The name
                  finds matching atoms; the description identifies the right one when names repeat.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <ClearFormButton onClick={resetFlow} disabled={isParsing || isReviewing || isPublishing} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isParsing || isReviewing || isPublishing}
              className={`inline-flex rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${parsedRows ? 'border border-line bg-paper/70 text-ink hover:border-ink/20' : 'border border-ink bg-ink text-paper hover:opacity-[0.85]'}`}
            >
              {isParsing ? 'Preparing preview...' : parsedRows ? 'Refresh preview' : 'Preview CSV rows'}
            </button>
          </div>

          {!parsedRows && status ? <p role="status" className="text-sm leading-6 text-muted">{status}</p> : null}
          {!parsedRows && previewError ? <ErrorNotice message={previewError} /> : null}
          </section>

          {parsedRows ? (
            <section aria-label="CSV preview" className="space-y-4">
              <CsvReviewPrompt
                rowCount={parsedRows.length}
                reviewed={reviewRows !== null}
                description={reviewRows ? 'Your checks are complete. See which members are ready to add.' : 'Check the rows below, then review them to match existing atoms and check the list.'}
              >
                {!reviewError ? (
                  <DisabledActionTooltip reason={reviewDisabledReason}>
                    <button
                      type="button"
                      onClick={() => { if (reviewRows) showReview(); else void handleReview(); }}
                      disabled={!!reviewDisabledReason}
                      className="inline-flex rounded-full border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isReviewing ? 'Reviewing list entries...' : reviewRows ? 'View review results' : 'Continue to review'}
                    </button>
                  </DisabledActionTooltip>
                ) : null}
              </CsvReviewPrompt>
              <CsvListPreviewTable rows={parsedRows} nativeSymbol={networkConfig.nativeSymbol} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-paper/50 px-4 py-3">
                <p className="text-sm leading-6 text-muted">
                  {parsedRows.length} {parsedRows.length === 1 ? 'row' : 'rows'} previewed. Review will match each member to an existing atom and check for entries already in this list.
                </p>
                {!reviewError ? (
                  <DisabledActionTooltip reason={reviewDisabledReason}>
                    <button
                      type="button"
                      onClick={() => { if (reviewRows) showReview(); else void handleReview(); }}
                      disabled={!!reviewDisabledReason}
                      className="inline-flex rounded-full border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isReviewing ? 'Reviewing list entries...' : reviewRows ? 'View review results' : 'Continue to review'}
                    </button>
                  </DisabledActionTooltip>
                ) : null}
              </div>
              {status && !isReviewing && (parsedRows.length === 0 || (reviewStarted && !reviewRows)) ? (
                <p role="status" className="text-sm leading-6 text-muted">{status}</p>
              ) : null}
              {previewError ? <ErrorNotice message={previewError} /> : null}
            </section>
          ) : null}

          <div ref={reviewRef} tabIndex={-1} role="region" aria-label="List entry review" className="scroll-mt-6 space-y-8 outline-none">
          {isReviewing ? (
            <CsvReviewLoadingPanel kind="list members" rowCount={parsedRows?.length ?? 0} networkName={networkConfig.name} />
          ) : null}
          {reviewError ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/80 bg-paper/65 p-4">
              <div className="min-w-0 flex-1 space-y-2">
                <ErrorNotice message={reviewError} />
                <p className="text-sm leading-6 text-muted">
                  {limitChanged
                    ? 'Refresh the preview to apply your updated row limit, then review again.'
                    : 'Your preview is unchanged. Retry the checks when ready.'}
                </p>
              </div>
              <DisabledActionTooltip reason={reviewDisabledReason}>
                <button
                  type="button"
                  onClick={() => { limitChanged ? handlePreview() : void handleReview(); }}
                  disabled={!limitChanged && !!reviewDisabledReason}
                  className="inline-flex shrink-0 rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {limitChanged ? 'Refresh preview' : 'Try review again'}
                </button>
              </DisabledActionTooltip>
            </div>
          ) : null}

          {reviewRows ? (
            <section aria-label="List entry review results" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-terminal text-muted">Review complete</p>
                  <h2 className="mt-1 text-xl font-medium text-ink">List entry checks</h2>
                </div>
                <p role="status" className="text-sm text-muted">
                  {creatableEntries.length} of {reviewRows.length} rows eligible to publish
                </p>
              </div>
              {status && !isPublishing && !writeResult ? <p role="status" className="text-sm leading-6 text-muted">{status}</p> : null}
              <ListReviewTable
                rows={reviewRows}
                nativeSymbol={networkConfig.nativeSymbol}
                onSelectCandidate={(rowId, atom) => {
                  patchParsedRow(rowId, (entry) => ({
                    ...entry,
                    row: {
                      ...entry.row,
                      selectedAtom: atom,
                      resolutionNote: 'Selected manually after reviewing duplicate-name candidates.',
                    },
                  }));
                }}
                onRemoveRow={removeParsedRow}
              />
            </section>
          ) : null}
          </div>

          {reviewRows ? <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Only eligible members will be added. Existing entries and rows that need a choice or correction are left out.
                </p>
                <p className="text-sm leading-7 text-muted">
                  Eligible rows: <span className="text-ink">{creatableEntries.length}</span> / {reviewRows.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={creatableEntries.length === 0 || !canWrite || isPublishing || isReviewing || isParsing || !!publishDisabledReason}
                className="inline-flex rounded-full border border-ink px-5 py-3 text-sm text-ink transition-colors duration-150 hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? 'Publishing batch...' : hasNetworkMismatch ? 'Wrong network' : 'Publish eligible list entries'}
              </button>
            </div>

            {publishDisabledReason ? <p className="mt-4 text-sm leading-7 text-muted">{publishDisabledReason}</p> : null}

            {status && (isPublishing || writeResult) ? <p role="status" className="mt-4 text-sm leading-7 text-muted">{status}</p> : null}
            {publishError ? <ErrorNotice message={publishError} className="mt-4" /> : null}

            {writeResult?.txHash ? (
              <TransactionExplorerLink network={network} txHash={writeResult.txHash} trackingPending={writeResult.trackingPending} trackingUnavailable={writeResult.trackingUnavailable} />
            ) : null}
          </div> : null}
    </div>
  );
}
