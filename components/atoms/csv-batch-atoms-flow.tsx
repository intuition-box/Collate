'use client';

import { useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { FlowSteps } from '@/components/app/flow-steps';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { ClearFormButton } from '@/components/app/clear-form-button';
import { AtomReviewTable } from '@/components/atoms/atom-review-table';
import { CsvAtomPreviewTable } from '@/components/atoms/csv-atom-preview-table';
import { parseCsvAtomText } from '@/lib/csv/atom-csv';
import { downloadBasicAtomCsvTemplate, downloadSchemaAtomCsvTemplate } from '@/lib/csv/templates';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getCreatablePreparedAtoms, publishManualBatchAtoms, reviewAtomDraftBatch } from '@/lib/intuition/manual-batch-atoms';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { AtomReviewRow, AtomSchemaType, CsvAtomParseRow } from '@/types/atoms';
import type { WriteResult } from '@/types/writes';

const DEFAULT_CSV_TEXT = ['name,description,image_url', 'Acme Protocol,Collective knowledge graph builder,https://picsum.photos/120'].join('\n');

export function CsvBatchAtomsFlow() {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();

  const [defaultSchemaType, setDefaultSchemaType] = useState<AtomSchemaType>('Thing');
  const [csvText, setCsvText] = useState(DEFAULT_CSV_TEXT);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvAtomParseRow[] | null>(null);
  const [reviewRows, setReviewRows] = useState<AtomReviewRow[] | null>(null);
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

  const creatableAtoms = useMemo(() => (reviewRows ? getCreatablePreparedAtoms(reviewRows) : []), [reviewRows]);
  const invalidPreviewRows = useMemo(() => parsedRows?.filter((row) => row.errors.length > 0).length ?? 0, [parsedRows]);
  const publishDisabledReason = getPublishDisabledReason({
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
    setReviewRows(null);
    setStatus(null);
    setError(null);
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
      setError(caughtError instanceof Error ? caughtError.message : 'Could not read the CSV file.');
    }
  }

  function handlePreview() {
    setIsParsing(true);
    setError(null);
    setStatus('Parsing CSV rows...');
    setWriteResult(null);
    setReviewRows(null);

    try {
      const result = parseCsvAtomText(csvText, defaultSchemaType);
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
      setError(caughtError instanceof Error ? `CSV atom parsing failed: ${caughtError.message}` : 'CSV atom parsing failed.');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleReview() {
    if (!parsedRows || parsedRows.length === 0) {
      setError('Preview the CSV before reviewing it.');
      return;
    }

    setIsReviewing(true);
    setError(null);
    setWriteResult(null);
    setStatus('Preparing chain review for parsed CSV rows...');

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
      setStatus(`Review ready. ${nextRows.filter((row) => row.status === 'ready_to_create').length} atoms can be created.`);
    } catch (caughtError) {
      setReviewRows(null);
      setStatus(null);
      setError(caughtError instanceof Error ? `CSV atom review failed: ${caughtError.message}` : 'CSV atom review failed.');
    } finally {
      setIsReviewing(false);
    }
  }

  async function handlePublish() {
    if (!reviewRows || creatableAtoms.length === 0) {
      setError('Review the CSV batch before publishing.');
      return;
    }

    if (!canWrite || !walletClient || !address) {
      setError(`Connect a wallet on ${networkConfig.name} before publishing the batch.`);
      return;
    }

    setIsPublishing(true);
    setError(null);
    setStatus('Waiting for wallet approval to create the eligible CSV atoms...');
    setWriteResult(null);

    try {
      const result = await publishManualBatchAtoms({
        atoms: creatableAtoms,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
        activityFlow: 'csv_atoms',
      });

      setWriteResult(result);
      setStatus(`CSV batch confirmed. ${result.createdIds.length} atoms were created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `CSV atom publish failed: ${caughtError.message}` : 'CSV atom publish failed.');
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

          <FlowSteps
            steps={[
              { label: 'Load CSV', hint: 'Upload a file or paste CSV text, then choose the default schema type if needed.' },
              { label: 'Preview rows', hint: 'See what parsed correctly before review runs against the protocol.' },
              { label: 'Review atoms', hint: 'Validate duplicates, existing atoms, and row-level issues before publish.' },
              { label: 'Publish eligible atoms', hint: 'Only ready rows are submitted. Invalid or existing rows stay skipped.' },
            ]}
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
                  placeholder="name,description,image_url"
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
                  <div className="flex items-center gap-2">
                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink">
                        Download sample
                      </summary>
                      <div className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open');
                            downloadBasicAtomCsvTemplate();
                          }}
                          className="block w-full px-4 py-3 text-left text-sm text-ink transition-colors duration-150 hover:bg-paper/70"
                        >
                          Basic atom CSV
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget.closest('details')?.removeAttribute('open');
                            downloadSchemaAtomCsvTemplate();
                          }}
                          className="block w-full border-t border-line/70 px-4 py-3 text-left text-sm text-ink transition-colors duration-150 hover:bg-paper/70"
                        >
                          Schema-aware CSV
                        </button>
                      </div>
                    </details>
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

              <label className="space-y-2">
                <span className="text-sm text-muted">Default schema type</span>
                <select
                  value={defaultSchemaType}
                  onChange={(event) => {
                    setDefaultSchemaType(event.target.value as AtomSchemaType);
                    resetDownstreamState();
                  }}
                  className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-3 text-sm text-ink outline-none"
                >
                  {(['Thing', 'Person', 'Organization', 'Account', 'Raw'] as AtomSchemaType[]).map((schemaType) => (
                    <option key={schemaType} value={schemaType}>
                      {schemaType}
                    </option>
                  ))}
                </select>
              </label>

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
              className="inline-flex rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper transition-opacity duration-150 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isParsing ? 'Parsing CSV...' : 'Preview CSV rows'}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleReview();
              }}
              disabled={!parsedRows || isReviewing || isPublishing || isParsing}
              className="inline-flex rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewing ? 'Reviewing atoms...' : 'Review atoms'}
            </button>
          </div>

          {parsedRows ? <CsvAtomPreviewTable rows={parsedRows} /> : null}
          {reviewRows ? <AtomReviewTable rows={reviewRows} nativeSymbol={networkConfig.nativeSymbol} /> : null}

          <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Publish</p>
                <p className="text-sm leading-7 text-muted">
                  Review comes first. Invalid, existing, and duplicate rows stay visible for review but are never included in the write.
                </p>
                <p className="text-sm leading-7 text-muted">
                  Parsed invalid rows: <span className="text-ink">{invalidPreviewRows}</span>
                </p>
                <p className="text-sm leading-7 text-muted">
                  Eligible rows: <span className="text-ink">{creatableAtoms.length}</span> / {reviewRows?.length ?? 0}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handlePublish();
                }}
                disabled={!reviewRows || creatableAtoms.length === 0 || !canWrite || isPublishing || isReviewing || isParsing}
                className="inline-flex rounded-full border border-[#5d8a62] bg-[#edf6ee] px-5 py-3 text-sm text-[#1f5a2d] transition-colors duration-150 hover:bg-[#dbeedc] disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
              >
                {isPublishing ? 'Publishing batch...' : hasNetworkMismatch ? 'Wrong network' : 'Publish eligible CSV atoms'}
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
