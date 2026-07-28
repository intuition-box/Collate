'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { DisabledActionTooltip } from '@/components/app/disabled-action-tooltip';
import { FlowSteps } from '@/components/app/flow-steps';
import { useSelectedNetwork } from '@/components/app/network-provider';
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
import type { IntuitionAtomSearchResult } from '@/types/api';
import type { CsvListParseRow, ManualListReviewRow } from '@/types/lists';
import type { WriteResult } from '@/types/writes';

const DEFAULT_CSV_TEXT = ['member,description', 'Ethereum,Layer one', 'Base,Layer two'].join('\n');

export function CsvBatchListsFlow() {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();

  const [listQuery, setListQuery] = useState('');
  const [listAtom, setListAtom] = useState<IntuitionAtomSearchResult | null>(null);
  const [csvText, setCsvText] = useState(DEFAULT_CSV_TEXT);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvListParseRow[] | null>(null);
  const [reviewRows, setReviewRows] = useState<ManualListReviewRow[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

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
  const publishDisabledReason = getPublishDisabledReason({
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
    setReviewRows(null);
    setStatus(null);
    setError(null);
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
      setError(caughtError instanceof Error ? `CSV list file read failed: ${caughtError.message}` : 'CSV list file read failed.');
    }
  }

  function handlePreview() {
    setIsParsing(true);
    setError(null);
    setStatus('Parsing CSV rows...');
    setWriteResult(null);
    setReviewRows(null);

    try {
      const result = parseCsvListText(csvText);
      setParsedRows(result.parsedRows);
      setStatus(
        result.parsedRows.length === 0 ? 'No CSV rows were parsed.' : `Parsed ${result.parsedRows.length} list rows. Continue to review for resolution and duplicate checks.`,
      );
    } catch (caughtError) {
      setParsedRows(null);
      setStatus(null);
      setError(caughtError instanceof Error ? `CSV list parsing failed: ${caughtError.message}` : 'CSV list parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleReview() {
    if (!listAtom) {
      setError('Select an existing list atom before reviewing CSV rows.');
      return;
    }

    if (!parsedRows || parsedRows.length === 0) {
      setError('Preview the CSV before reviewing it.');
      return;
    }

    setIsReviewing(true);
    setError(null);
    setWriteResult(null);
    setStatus('Resolving member atoms and preparing list review...');

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
      setStatus(`Review ready. ${getCreatablePreparedListEntries(nextRows).length} list entries can be created.`);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setError(caughtError instanceof Error ? `CSV list review failed: ${caughtError.message}` : 'CSV list review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  function patchParsedRow(rowId: string, updater: (entry: CsvListParseRow) => CsvListParseRow) {
    setParsedRows((current) => current?.map((entry) => (entry.row.id === rowId ? updater(entry) : entry)) ?? null);
    setReviewRows(null);
    setStatus('Row updated. Review the batch again to refresh statuses.');
    setError(null);
    setWriteResult(null);
  }

  function removeParsedRow(rowId: string) {
    setParsedRows((current) => current?.filter((entry) => entry.row.id !== rowId) ?? null);
    setReviewRows((current) => current?.filter((entry) => entry.id !== rowId) ?? null);
    setStatus('Row removed. Review the batch again if needed.');
    setError(null);
    setWriteResult(null);
  }

  async function handlePublish() {
    if (!reviewRows || creatableEntries.length === 0) {
      setError('Review the CSV list batch before publishing.');
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
      });

      setWriteResult(result);
      setStatus(`CSV batch confirmed. ${result.createdIds.length} list entries were created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `CSV list publish failed: ${caughtError.message}` : 'CSV list publish failed.');
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
                Select an existing list atom, upload or paste member CSV rows, resolve each row against existing atoms,
                then publish only the missing list entries in one transaction.
              </p>
            </div>
          </div>

          <FlowSteps
            steps={[
              { label: 'Choose a list', hint: 'Select the existing list atom you want to update before importing members.' },
              { label: 'Load CSV', hint: 'Upload a file or paste CSV text for the member rows.' },
              { label: 'Review and resolve', hint: 'Preview rows, resolve ambiguous matches, and confirm which entries are publishable.' },
              { label: 'Publish missing entries', hint: 'Only ready list entries are submitted. Missing or ambiguous rows stay blocked.' },
            ]}
          />

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
                  onChange={(event) => {
                    setCsvText(event.target.value);
                    resetDownstreamState();
                  }}
                  rows={12}
                  className="min-h-[24rem] w-full flex-1 resize-y rounded-xl border border-line/80 bg-white/70 px-4 py-4 font-mono text-sm leading-7 text-ink outline-none"
                  placeholder="member,description"
                />
              </label>
            </div>

            <div className="space-y-4 rounded-[1.15rem] border border-line/80 bg-paper/65 p-5">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">CSV source</p>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer rounded-full border border-line bg-white/85 px-4 py-2 text-sm text-ink">
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".csv,text/csv"
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
                <p>Exact single matches auto-resolve. Ambiguous rows require manual selection. Missing rows stay blocked until removed.</p>
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
              className="inline-flex rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper transition-opacity duration-150 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isParsing ? 'Parsing CSV...' : 'Preview CSV rows'}
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
                {isReviewing ? 'Reviewing list rows...' : 'Review list rows'}
              </button>
            </DisabledActionTooltip>
          </div>

          {parsedRows ? <CsvListPreviewTable rows={parsedRows} /> : null}
          {reviewRows ? (
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
          ) : null}

          <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Review comes first. `ready_to_create` and `ready_with_matches` rows are included. Existing, duplicate,
                  ambiguous, missing, and invalid rows are blocked.
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
                disabled={!reviewRows || creatableEntries.length === 0 || !canWrite || isPublishing || isReviewing || isParsing}
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
