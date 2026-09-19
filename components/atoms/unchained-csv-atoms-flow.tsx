'use client';

import { useMemo, useState } from 'react';
import { getClassification } from '@0xintuition/classifications';
import { formatEther, getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { FlowSteps } from '@/components/app/flow-steps';
import { ClearFormButton } from '@/components/app/clear-form-button';
import { UnchainedClassificationPicker } from '@/components/atoms/unchained-classification-picker';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { ReviewStatusPill } from '@/components/app/review-status-pill';
import { getUnchainedAtomDisplayName, parseUnchainedAtomCsvText } from '@/lib/csv/unchained-atom-csv';
import { downloadUnchainedAtomCsvTemplate, getUnchainedAtomCsvTemplate } from '@/lib/csv/unchained-atom-templates';
import { publishManualBatchAtoms } from '@/lib/intuition/manual-batch-atoms';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { getCreatableUnchainedAtoms, reviewUnchainedCsvAtoms } from '@/lib/intuition/unchained-csv-atoms';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { UnchainedCsvAtomParseRow, UnchainedCsvAtomReviewRow } from '@/types/atoms';
import type { WriteResult } from '@/types/writes';

const STARTER_CLASSIFICATION = 'thing';
const STARTER_CSV = getUnchainedAtomCsvTemplate(STARTER_CLASSIFICATION);

export function UnchainedCsvAtomsFlow({ active = true }: { active?: boolean }) {
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { network } = useSelectedNetwork();
  const [classification, setClassification] = useState(STARTER_CLASSIFICATION);
  const [csvText, setCsvText] = useState(STARTER_CSV);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [parsedRows, setParsedRows] = useState<UnchainedCsvAtomParseRow[] | null>(null);
  const [reviewRows, setReviewRows] = useState<UnchainedCsvAtomReviewRow[] | null>(null);
  const [approvedMatchIds, setApprovedMatchIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const sample = useMemo(() => getUnchainedAtomCsvTemplate(classification), [classification]);
  const selectedSpec = getClassification(classification);
  const publicClient = useMemo(() => createIntuitionPublicClient(network), [network]);
  const networkConfig = getIntuitionNetwork(network);
  const walletNetwork = getIntuitionNetworkByChainId(chainId ?? null);
  const walletReady = accountStatus === 'connected' && !!address;
  const hasNetworkMismatch = walletReady && walletNetwork?.key !== network;
  const canWrite = walletReady && !hasNetworkMismatch && network === 'testnet';
  const eligible = reviewRows ? getCreatableUnchainedAtoms(reviewRows) : [];
  const disabledReason = network === 'mainnet'
    ? 'Unchained publishing is available on Testnet while graph display is being verified. Switch to Testnet, or use Classic CSV on Mainnet.'
    : getPublishDisabledReason({
    hasReview: !!reviewRows,
    eligibleCount: eligible.length,
    walletReady,
    hasNetworkMismatch,
    networkName: networkConfig.name,
    isBusy: isReviewing || isPublishing,
    subjectLabel: 'Unchained CSV atom',
  });

  function clearReview() {
    setParsedRows(null);
    setReviewRows(null);
    setApprovedMatchIds(new Set());
    setStatus(null);
    setError(null);
    setWriteResult(null);
  }

  function changeClassification(next: string) {
    const oldSample = sample;
    setClassification(next);
    if (!csvText.trim() || csvText === oldSample) setCsvText(getUnchainedAtomCsvTemplate(next));
    clearReview();
  }

  function resetFlow() {
    setClassification(STARTER_CLASSIFICATION);
    setCsvText('');
    setFileName(null);
    setFileInputKey((current) => current + 1);
    clearReview();
    setStatus('CSV form cleared. Choose a classification and load a file or sample.');
  }

  async function loadFile(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      setCsvText(text);
      setFileName(file.name);
      clearReview();
      setStatus(`Loaded ${file.name}. Preview its rows before review.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not read this CSV file.');
    }
  }

  function previewRows() {
    clearReview();
    try {
      const result = parseUnchainedAtomCsvText(csvText, classification);
      setParsedRows(result.rows);
      const invalid = result.rows.filter((row) => row.errors.length).length;
      setStatus(`Parsed ${result.rows.length} rows. ${invalid} need correction before publishing.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'CSV could not be parsed.');
    }
  }

  async function reviewRowsNow() {
    if (!parsedRows?.length) {
      setError('Preview the CSV rows first.');
      return;
    }

    setIsReviewing(true);
    setReviewRows(null);
    setError(null);
    setStatus('Checking canonical IDs and same-name atoms on the selected network...');
    try {
      const rows = await reviewUnchainedCsvAtoms({ rows: parsedRows, network, publicClient, approvedMatchIds });
      setReviewRows(rows);
      setStatus(`Review ready. ${rows.filter((row) => row.status === 'ready_to_create').length} atoms are eligible.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? caughtError.message : 'Atom review failed. No rows can be published.');
    } finally {
      setIsReviewing(false);
    }
  }

  function approveDistinctAtom(id: string) {
    setApprovedMatchIds((current) => new Set(current).add(id));
    setReviewRows(null);
    setStatus('Choice recorded. Review again to refresh the final publish list.');
  }

  function removeRow(id: string) {
    setParsedRows((current) => current?.filter((row) => row.atom.id !== id) ?? null);
    setReviewRows(null);
    setApprovedMatchIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setStatus('Row removed from this import. The pasted CSV text has not changed. Review the remaining rows again.');
  }

  async function publish() {
    if (!reviewRows || !eligible.length) {
      setError('Review at least one eligible row before publishing.');
      return;
    }
    if (network !== 'testnet') {
      setError('Unchained publishing is on Testnet while graph display is being verified. Use Classic CSV for Mainnet.');
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
        activityFlow: 'csv_atoms',
      });
      setWriteResult(result);
      setStatus(`Transaction confirmed. ${result.createdIds.length} canonical atoms were created on ${networkConfig.name}.`);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? `Publish failed: ${caughtError.message}` : 'Publish failed. No success was recorded.');
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-8 px-6 py-6 sm:px-8 sm:py-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-terminal text-muted">Unchained CSV atoms</p>
        <h1 className="font-serif text-4xl tracking-tight text-ink sm:text-5xl">One format for each atom type.</h1>
        <p className="max-w-3xl text-sm leading-7 text-muted">
          Choose a classification to see its exact CSV shape. Preview every row, compare existing atoms, then publish only the eligible ones.
        </p>
        <p className="text-sm text-muted">Canonical publishing is available on Testnet first. Mainnet keeps the established Classic CSV path until graph display is verified.</p>
      </div>

      <FlowSteps steps={[
        { label: 'Choose type', hint: 'See and download a sample for the selected classification.' },
        { label: 'Load CSV', hint: 'Upload a file or paste its text, then preview the parsed values.' },
        { label: 'Review atoms', hint: 'Check exact IDs, repeated rows, and same-name matches.' },
        { label: 'Publish', hint: 'Only confirmed eligible rows go into one wallet transaction.' },
      ]} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 space-y-3 rounded-xl border border-line/80 bg-paper/65 p-5">
          <label className="block text-xs uppercase tracking-terminal text-muted" htmlFor="unchained-csv-text">Paste CSV text</label>
          <textarea
            id="unchained-csv-text"
            value={csvText}
            onChange={(event) => { setCsvText(event.target.value); setFileName(null); clearReview(); }}
            rows={13}
            className="min-h-80 w-full resize-y rounded-xl border border-line/80 bg-white/75 p-4 font-mono text-sm leading-6 text-ink outline-none"
            placeholder="classification,name,deposit"
          />
          {fileName ? <p className="text-xs text-muted">Loaded file: {fileName}</p> : null}
        </div>

        <div className="min-w-0 space-y-5 rounded-xl border border-line/80 bg-paper/65 p-5">
          <UnchainedClassificationPicker value={classification} onChange={changeClassification} active={active} />
          <p className="text-sm leading-6 text-muted">{selectedSpec?.description}</p>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full border border-line bg-white/85 px-4 py-2 text-sm text-ink">
              <input
                key={fileInputKey}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => { void loadFile(event.target.files?.[0] ?? null); }}
              />
              Upload CSV file
            </label>
            <button type="button" onClick={() => downloadUnchainedAtomCsvTemplate(classification)} className="rounded-full border border-line bg-white/85 px-4 py-2 text-sm text-ink">
              Download {selectedSpec?.displayName} sample
            </button>
          </div>
          <div className="space-y-2 border-t border-line/80 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-terminal text-muted">Sample CSV</p>
              <button type="button" onClick={() => { setCsvText(sample); setFileName(null); clearReview(); }} className="text-sm text-ink underline underline-offset-4">
                Use this sample
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl border border-line/80 bg-white/75 p-3 font-mono text-xs leading-5 text-ink"><code>{sample}</code></pre>
            <p className="text-xs leading-5 text-muted">
              Only this classification’s listed fields become part of the atom. `deposit` is separate from the atom’s identity.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end"><ClearFormButton onClick={resetFlow} disabled={isReviewing || isPublishing} /></div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={previewRows} disabled={isReviewing || isPublishing} className="rounded-full border border-ink bg-ink px-4 py-2 text-sm text-paper disabled:opacity-60">
          Preview CSV rows
        </button>
        <button type="button" onClick={() => { void reviewRowsNow(); }} disabled={!parsedRows?.length || isReviewing || isPublishing} className="rounded-full border border-line bg-paper/70 px-4 py-2 text-sm text-ink disabled:opacity-60">
          {isReviewing ? 'Reviewing atoms...' : 'Review atoms'}
        </button>
      </div>

      {parsedRows ? (
        <div className="overflow-x-auto rounded-xl border border-line/80 bg-paper/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-terminal text-muted">Parsed rows</p>
          <table className="min-w-full text-left text-sm">
            <thead><tr className="text-xs uppercase text-muted"><th className="p-3">Line</th><th className="p-3">Atom</th><th className="p-3">Classification</th><th className="p-3">Preview</th><th className="p-3">Notes</th></tr></thead>
            <tbody className="divide-y divide-line/70">
              {parsedRows.map(({ atom, errors }) => (
                <tr key={atom.id}>
                  <td className="p-3 align-top text-muted">{atom.sourceLine}</td>
                  <td className="p-3 align-top text-ink">{getUnchainedAtomDisplayName(atom.values)}</td>
                  <td className="p-3 align-top text-muted">{getClassification(atom.classification)?.displayName ?? atom.classification}</td>
                  <td className="max-w-72 p-3 align-top text-muted"><div className="break-words font-mono text-xs">{JSON.stringify(atom.values)}</div></td>
                  <td className="p-3 align-top text-muted">
                    {errors.length ? <span className="text-[#8a4b38]">{errors.join(' ')}</span> : 'Ready for graph review.'}
                    <button type="button" onClick={() => removeRow(atom.id)} className="mt-2 block text-xs text-ink underline underline-offset-4">Remove row</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {reviewRows ? (
        <div className="overflow-x-auto rounded-xl border border-line/80 bg-paper/60 p-4">
          <p className="mb-3 text-xs uppercase tracking-terminal text-muted">Atom review</p>
          <table className="min-w-full text-left text-sm">
            <thead><tr className="text-xs uppercase text-muted"><th className="p-3">Atom</th><th className="p-3">Status</th><th className="p-3">Cost</th><th className="p-3">Detail</th></tr></thead>
            <tbody className="divide-y divide-line/70">
              {reviewRows.map((row) => (
                <tr key={row.id}>
                  <td className="p-3 align-top text-ink"><p>{row.label}</p><p className="text-xs text-muted">Line {row.payload.draft.sourceLine} · {getClassification(row.payload.draft.classification)?.displayName}</p></td>
                  <td className="p-3 align-top"><ReviewStatusPill status={row.status} /></td>
                  <td className="p-3 align-top text-muted">{row.payload.prepared ? `${formatEther(row.payload.prepared.assetWei)} ${networkConfig.nativeSymbol}` : '—'}</td>
                  <td className="min-w-64 p-3 align-top text-muted">
                    <p>{row.message}</p>
                    {row.payload.matches?.length ? (
                      <details className="mt-2 rounded-xl border border-line/80 bg-white/70 p-3">
                        <summary className="cursor-pointer text-sm text-ink">Compare {row.payload.matches.length} same-name atom{row.payload.matches.length === 1 ? '' : 's'}</summary>
                        <div className="mt-3 space-y-3">
                          {row.payload.matches.map((match) => (
                            <div key={match.termId} className="rounded-lg border border-line/80 p-3">
                              <p className="font-medium text-ink">{match.label} · {match.type}</p>
                              {resolveIntuitionImageUrl(match.image) ? <img src={resolveIntuitionImageUrl(match.image) ?? undefined} alt="" className="mt-2 h-14 w-14 rounded-lg border border-line/80 object-cover" /> : null}
                              <p className="mt-1 text-sm">{match.description || 'No description available.'}</p>
                              {match.url ? <p className="mt-1 break-all text-xs">{match.url}</p> : null}
                              {match.creatorLabel || match.creatorId ? <p className="mt-1 text-xs">Creator: {match.creatorLabel || match.creatorId}</p> : null}
                              <p className="mt-1 break-all font-mono text-xs">{match.termId}</p>
                            </div>
                          ))}
                          {row.status === 'ambiguous' ? (
                            <button type="button" onClick={() => approveDistinctAtom(row.id)} className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink">
                              I checked, create a distinct atom
                            </button>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="rounded-xl border border-line/80 bg-paper/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 text-sm leading-6 text-muted">
            <p className="text-xs uppercase tracking-terminal text-muted">Publish</p>
            <p>Only `ready_to_create` atoms enter the transaction. Same-name matches need your review first.</p>
            <p>Eligible rows: <span className="text-ink">{eligible.length}</span> / {reviewRows?.length ?? 0}</p>
          </div>
          <button
            type="button"
            onClick={() => { void publish(); }}
            disabled={!reviewRows || !eligible.length || !canWrite || isReviewing || isPublishing || !!writeResult}
            className="rounded-full border border-[#5d8a62] bg-[#edf6ee] px-5 py-3 text-sm text-[#1f5a2d] disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
          >
            {isPublishing ? 'Publishing...' : writeResult ? 'Published' : 'Publish eligible atoms'}
          </button>
        </div>
        {disabledReason && !writeResult ? <p className="mt-3 text-sm text-muted">{disabledReason}</p> : null}
        {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-[#8a4b38]">{error}</p> : null}
        {writeResult?.txHash ? (
          <a href={`${networkConfig.explorerUrl}/tx/${writeResult.txHash}`} target="_blank" rel="noreferrer" className="mt-3 block break-all font-mono text-xs text-ink underline underline-offset-4">
            View transaction: {writeResult.txHash}
          </a>
        ) : null}
      </div>
    </div>
  );
}
