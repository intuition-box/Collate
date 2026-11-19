'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { OptionPicker } from '@/components/app/option-picker';
import { CsvReviewLoadingPanel, CsvReviewPrompt, CsvWorkflowProgress, useCsvReviewNavigation } from '@/components/app/csv-workflow';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { ErrorNotice } from '@/components/app/error-notice';
import { usePublishToast } from '@/components/app/publish-toast-provider';
import { useCreationLimits } from '@/components/app/use-creation-limits';
import { TransactionExplorerLink } from '@/components/app/transaction-explorer-link';
import { ClearFormButton } from '@/components/app/clear-form-button';
import { AtomReviewTable } from '@/components/atoms/atom-review-table';
import { CLASSIC_ATOM_TYPE_OPTIONS } from '@/components/atoms/classic-atom-type-options';
import { CsvAtomPreviewTable } from '@/components/atoms/csv-atom-preview-table';
import { parseCsvAtomText } from '@/lib/csv/atom-csv';
import { downloadBasicAtomCsvTemplate, downloadSchemaAtomCsvTemplate } from '@/lib/csv/templates';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getCreatablePreparedAtoms, publishManualBatchAtoms, reviewAtomDraftBatch } from '@/lib/intuition/manual-batch-atoms';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import { getCsvWorkflowStage } from '@/lib/utils/csv-workflow-state';
import type { AtomReviewRow, AtomSchemaType, CsvAtomParseRow } from '@/types/atoms';
import type { WriteResult } from '@/types/writes';

const DEFAULT_CSV_TEXT = ['name,description,image_url', 'Acme Protocol,Collective knowledge graph builder,https://picsum.photos/120'].join('\n');

export function CsvBatchAtomsFlow() {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();
  const showConfirmedPublish = usePublishToast();
  const { limits, isPending: limitsPending, isError: limitsError } = useCreationLimits(address);
  const atomLimit = limits.atomLimit;

  const [defaultSchemaType, setDefaultSchemaType] = useState<AtomSchemaType>('Thing');
  const [csvText, setCsvText] = useState(DEFAULT_CSV_TEXT);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvAtomParseRow[] | null>(null);
  const [previewLimit, setPreviewLimit] = useState<number | null>(null);
  const [reviewRows, setReviewRows] = useState<AtomReviewRow[] | null>(null);
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

  const creatableAtoms = useMemo(() => (reviewRows ? getCreatablePreparedAtoms(reviewRows) : []), [reviewRows]);
  const invalidPreviewRows = useMemo(() => parsedRows?.filter((row) => row.errors.length > 0).length ?? 0, [parsedRows]);
  const limitChanged = previewLimit !== null && previewLimit !== atomLimit;
  const workflowStage = getCsvWorkflowStage({
    hasPreview: parsedRows !== null,
    isReviewing,
    hasReview: reviewRows !== null,
    reviewStarted,
    reviewFailed: reviewError !== null,
  });
  const publishDisabledReason = limitsError ? 'Batch limits are unavailable. Refresh this page before publishing.' : limitsPending ? 'Loading batch limits. Please wait before publishing.' : limitChanged ? `Your atom limit changed to ${atomLimit}. Preview the CSV again before publishing.` : getPublishDisabledReason({
    hasReview: !!reviewRows,
    eligibleCount: creatableAtoms.length,
    walletReady,
    hasNetworkMismatch,
    networkName: networkConfig.name,
    isBusy: isParsing || isReviewing || isPublishing,
    subjectLabel: 'CSV atom',
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
    setDefaultSchemaType('Thing');
    setCsvText('');
    setFileName(null);
    setFileInputKey((current) => current + 1);
    resetDownstreamState();
    setStatus('CSV atom form cleared. Paste CSV text or upload a file to start again.');
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
      setPreviewError(caughtError instanceof Error ? caughtError.message : 'Could not read the CSV file.');
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
      const result = parseCsvAtomText(csvText, defaultSchemaType, atomLimit);
      setPreviewLimit(atomLimit);
      const nextInvalidCount = result.rows.filter((row) => row.errors.length > 0).length;
      setParsedRows(result.rows);
      setStatus(
        result.rows.length === 0
          ? 'No CSV rows were parsed.'
          : `Parsed ${result.rows.length} rows. ${result.rows.length - nextInvalidCount} rows are ready for chain review.`,
      );
    } catch (caughtError) {
      setParsedRows(null);
      setStatus(null);
      setPreviewError(caughtError instanceof Error ? `CSV atom parsing failed: ${caughtError.message}` : 'CSV atom parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleReview() {
    navigateToReview();
    if (limitChanged) {
      setReviewError(`Your atom limit changed to ${atomLimit}. Preview the CSV again before reviewing.`);
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
      const draftErrorsById = new Map<string, string[]>(
        parsedRows.filter((row) => row.errors.length > 0).map((row) => [row.atom.id, row.errors]),
      );
      const nextRows = await reviewAtomDraftBatch({
        drafts: parsedRows.map((row) => row.atom),
        network,
        publicClient,
        draftErrorsById,
      });

      setReviewRows(nextRows);
      setStatus(null);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setReviewError(caughtError instanceof Error ? `CSV atom review failed: ${caughtError.message}` : 'CSV atom review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  async function handlePublish() {
    if (limitsPending || limitsError || limitChanged) {
      setPublishError(publishDisabledReason ?? 'Batch limits are unavailable. Try again.');
      return;
    }
    if (!reviewRows || creatableAtoms.length === 0) {
      setPublishError('Review the CSV batch before publishing.');
      return;
    }

    if (!canWrite || !walletClient || !address) {
      setPublishError(`Connect a wallet on ${networkConfig.name} before publishing the batch.`);
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setStatus('Checking limits before requesting wallet approval for the eligible CSV atoms...');
    setWriteResult(null);

    try {
      const result = await publishManualBatchAtoms({
        atoms: creatableAtoms,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: 'csv_atoms',
        limit: atomLimit,
      });

      setWriteResult(result);
      setStatus(`CSV batch confirmed. ${result.createdIds.length} atoms were created on ${networkConfig.name}.`);
      showConfirmedPublish({ result, kind: 'atom', network });
    } catch (caughtError) {
      setStatus(null);
      setPublishError(caughtError instanceof Error ? `CSV atom publish failed: ${caughtError.message}` : 'CSV atom publish failed.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">CSV batch atoms</p>
              <h1 className="font-serif text-[2.6rem] leading-none tracking-[-0.05em] sm:text-[3.3rem]">
                Import atom rows from CSV and review before publish.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted">
                Upload or paste CSV data, preview the parsed rows, then run duplicate and existing checks before sending one
                `createAtoms` transaction for the eligible rows only.
              </p>
            </div>
          </div>

          <CsvWorkflowProgress activeStage={workflowStage} finished={!!writeResult} />

          <section aria-labelledby="prepare-atoms-title" className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-terminal text-muted">Prepare</p>
              <h2 id="prepare-atoms-title" className="text-xl font-medium text-ink">Prepare your atom CSV</h2>
            </div>

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
                  placeholder="name,description,image_url"
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
                  <div className="flex items-center gap-2">
                    <OptionPicker
                      options={[
                        { value: 'basic', label: 'Basic atom CSV', description: 'One default schema for every row.' },
                        { value: 'schema', label: 'Schema-aware CSV', description: 'Mix atom types in one file.' },
                      ]}
                      onChange={(value) => value === 'basic' ? downloadBasicAtomCsvTemplate() : downloadSchemaAtomCsvTemplate()}
                      label="Download sample"
                      showLabel={false}
                      compact
                      disabled={isReviewing || isPublishing}
                    />
                    <span className="group relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white/80 text-xs text-muted">
                      ?
                      <span className="pointer-events-none absolute right-0 top-9 z-30 hidden w-64 rounded-xl border border-line bg-white p-3 text-left text-[0.72rem] leading-5 text-muted group-hover:block group-focus:block">
                        Basic is best when every row uses the selected default schema. Schema-aware includes `schema_type` for mixed atom types.
                      </span>
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-7 text-muted">{fileName ? `Loaded file: ${fileName}` : 'You can upload a file or paste CSV text.'}</p>
              </div>

              <OptionPicker
                options={CLASSIC_ATOM_TYPE_OPTIONS}
                value={defaultSchemaType}
                disabled={isReviewing || isPublishing}
                onChange={(value) => {
                  setDefaultSchemaType(value as AtomSchemaType);
                  resetDownstreamState();
                }}
                label="Default schema type"
              />

              <div className="space-y-2 text-sm leading-7 text-muted">
                <p>Supported headers include `name`, `description`, `url`, `image_url`, `deposit`, `schema_type`, `account_address`, `chain_id`, and `raw_data`.</p>
                <p>Use the basic sample for one schema. Use the schema sample when rows mix Thing, Person, Organization, Account, or Raw atoms.</p>
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
                description={reviewRows ? 'Your checks are complete. See which atoms are ready to publish.' : 'Check the rows below, then review them for existing atoms and duplicates.'}
              >
                {!reviewError ? (
                  <button
                    type="button"
                    onClick={() => { if (reviewRows) showReview(); else void handleReview(); }}
                    disabled={isReviewing || isPublishing || isParsing || parsedRows.length === 0}
                    className="inline-flex rounded-full border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isReviewing ? 'Reviewing atoms...' : reviewRows ? 'View review results' : 'Continue to review'}
                  </button>
                ) : null}
              </CsvReviewPrompt>
              <CsvAtomPreviewTable rows={parsedRows} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-paper/50 px-4 py-3">
                <p className="text-sm leading-6 text-muted">
                  {parsedRows.length} {parsedRows.length === 1 ? 'row' : 'rows'} previewed. Review checks for existing atoms and duplicates before anything can be published.
                </p>
                {!reviewError ? (
                  <button
                    type="button"
                    onClick={() => { if (reviewRows) showReview(); else void handleReview(); }}
                    disabled={isReviewing || isPublishing || isParsing || parsedRows.length === 0}
                    className="inline-flex rounded-full border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isReviewing ? 'Reviewing atoms...' : reviewRows ? 'View review results' : 'Continue to review'}
                  </button>
                ) : null}
              </div>
              {status && parsedRows.length === 0 ? <p role="status" className="text-sm leading-6 text-muted">{status}</p> : null}
              {previewError ? <ErrorNotice message={previewError} /> : null}
            </section>
          ) : null}

          <div ref={reviewRef} tabIndex={-1} role="region" aria-label="Atom review" className="scroll-mt-6 space-y-8 outline-none">
          {isReviewing ? (
            <CsvReviewLoadingPanel kind="atoms" rowCount={parsedRows?.length ?? 0} networkName={networkConfig.name} />
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
              <button
                type="button"
                onClick={() => { limitChanged ? handlePreview() : void handleReview(); }}
                disabled={isReviewing || isPublishing || isParsing}
                className="inline-flex shrink-0 rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-[0.85] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {limitChanged ? 'Refresh preview' : 'Try review again'}
              </button>
            </div>
          ) : null}
          {reviewRows ? (
            <section aria-label="Atom review results" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-terminal text-muted">Review complete</p>
                  <h2 className="mt-1 text-xl font-medium text-ink">Atom checks</h2>
                </div>
                <p role="status" className="text-sm text-muted">
                  {creatableAtoms.length} of {reviewRows.length} rows eligible to publish
                </p>
              </div>
              <AtomReviewTable rows={reviewRows} nativeSymbol={networkConfig.nativeSymbol} />
            </section>
          ) : null}
          </div>

          {reviewRows ? <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Only eligible atoms will be published. Existing atoms, duplicates, and rows with errors are left out.
                </p>
                <p className="text-sm leading-7 text-muted">
                  Parsed invalid rows: <span className="text-ink">{invalidPreviewRows}</span>
                </p>
                <p className="text-sm leading-7 text-muted">
                  Eligible rows: <span className="text-ink">{creatableAtoms.length}</span> / {reviewRows.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={creatableAtoms.length === 0 || !canWrite || isPublishing || isReviewing || isParsing || !!publishDisabledReason}
                className="inline-flex rounded-full border border-success/40 bg-accentSoft px-5 py-3 text-sm text-successInk transition-colors duration-150 hover:bg-accent/25 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
              >
                {isPublishing ? 'Publishing batch...' : hasNetworkMismatch ? 'Wrong network' : 'Publish eligible CSV atoms'}
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
