'use client';

import { useId, useState } from 'react';
import { formatEther } from 'viem';

import { ReviewStatusPill } from '@/components/app/review-status-pill';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import type { IntuitionAtomSearchResult } from '@/types/api';
import type { ManualListReviewRow } from '@/types/lists';

function getCandidateContext(atom: IntuitionAtomSearchResult): string | null {
  if (atom.url) {
    try {
      return new URL(atom.url).hostname.replace(/^www\./, '');
    } catch {
      return atom.url.length <= 36 ? atom.url : null;
    }
  }

  if (atom.creatorLabel) {
    return atom.creatorLabel;
  }

  if (atom.creatorId) {
    return `Creator ${atom.creatorId.slice(0, 6)}...${atom.creatorId.slice(-4)}`;
  }

  return null;
}

function CandidateImage({ atom, size = 'compact' }: { atom: IntuitionAtomSearchResult; size?: 'compact' | 'detail' }) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageUrl = resolveIntuitionImageUrl(atom.image);
  const dimensions = size === 'detail' ? 'h-16 w-16 rounded-xl' : 'h-10 w-10 rounded-lg';

  if (!imageUrl || hasFailed) {
    return (
      <div
        aria-hidden="true"
        className={`${dimensions} flex shrink-0 items-center justify-center border border-dashed border-line bg-paper/80 text-sm font-medium text-muted`}
      >
        {atom.label.trim().slice(0, 1).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      onError={() => setHasFailed(true)}
      className={`${dimensions} shrink-0 border border-line/70 object-cover`}
    />
  );
}

function CandidateOption({
  atom,
  index,
  isSelected,
  onSelect,
}: {
  atom: IntuitionAtomSearchResult;
  index: number;
  isSelected: boolean;
  onSelect: (atom: IntuitionAtomSearchResult) => void;
}) {
  const detailsId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const context = getCandidateContext(atom);
  const canOpenUrl = atom.url?.startsWith('https://') || atom.url?.startsWith('http://');

  function showDetails() {
    setIsOpen(true);
  }

  function hideDetails() {
    if (!isPinned) {
      setIsOpen(false);
    }
  }

  return (
    <div
      className={`min-w-0 rounded-xl border transition-colors duration-150 ${
        isSelected
          ? 'border-success/30 bg-success/10'
          : isOpen
            ? 'border-ink/20 bg-white/90'
            : 'border-line/80 bg-white/70 hover:border-ink/15'
      }`}
      onMouseEnter={showDetails}
      onMouseLeave={hideDetails}
      onFocusCapture={showDetails}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hideDetails();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailsId}
        onClick={() => {
          setIsPinned((current) => {
            const next = !current;
            setIsOpen(next);
            return next;
          });
        }}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <CandidateImage atom={atom} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm text-ink">{atom.label}</span>
            <span className={`shrink-0 text-[0.64rem] uppercase tracking-terminal ${isSelected ? 'text-success' : 'text-muted'}`}>
              {isSelected ? 'Selected' : `Option ${index + 1}`}
            </span>
          </span>
          <span className="mt-1 block truncate text-[0.76rem] leading-5 text-muted">
            {atom.description?.trim() || 'No description provided'}
          </span>
          <span className="mt-0.5 block truncate text-[0.68rem] leading-5 text-muted">
            {atom.type}
            {context ? ` · ${context}` : ` · ${atom.positionCount} ${atom.positionCount === 1 ? 'position' : 'positions'}`}
          </span>
        </span>
      </button>

      {isOpen ? (
        <div id={detailsId} className="border-t border-line/70 p-3">
          <div className="flex gap-3">
            <CandidateImage atom={atom} size="detail" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-ink">{atom.label}</p>
              <p className="text-[0.72rem] leading-5 text-muted">
                {atom.type} · {atom.positionCount} {atom.positionCount === 1 ? 'position' : 'positions'}
              </p>
              <p className="text-sm leading-6 text-muted">{atom.description?.trim() || 'No description was provided for this atom.'}</p>
            </div>
          </div>

          <dl className="mt-3 grid gap-2 text-[0.72rem] leading-5 text-muted">
            {atom.url ? (
              <div>
                <dt className="uppercase tracking-terminal">URL</dt>
                <dd>
                  {canOpenUrl ? (
                    <a
                      href={atom.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-ink underline decoration-line underline-offset-4"
                    >
                      {atom.url}
                    </a>
                  ) : (
                    <span className="break-all">{atom.url}</span>
                  )}
                </dd>
              </div>
            ) : null}
            {atom.creatorLabel || atom.creatorId ? (
              <div>
                <dt className="uppercase tracking-terminal">Creator</dt>
                <dd className="break-all">{atom.creatorLabel ?? atom.creatorId}</dd>
              </div>
            ) : null}
            <div>
              <dt className="uppercase tracking-terminal">Term ID</dt>
              <dd className="break-all font-mono">{atom.termId}</dd>
            </div>
          </dl>

          {isSelected ? (
            <span className="mt-3 inline-flex rounded-full border border-success/30 bg-success/10 px-4 py-2 text-[0.76rem] text-success">
              Currently selected
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(atom)}
              className="mt-3 inline-flex rounded-full border border-ink bg-ink px-4 py-2 text-[0.76rem] text-paper transition-opacity duration-150 hover:opacity-[0.85]"
            >
              Use this atom
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ListReviewTable({
  rows,
  nativeSymbol,
  onSelectCandidate,
  onRemoveRow,
}: {
  rows: ManualListReviewRow[];
  nativeSymbol: string;
  onSelectCandidate?: ((rowId: string, atom: IntuitionAtomSearchResult) => void) | undefined;
  onRemoveRow?: ((rowId: string) => void) | undefined;
}) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-line bg-paper/60 p-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">List review</p>
        <p className="text-sm leading-7 text-muted">
          Review each member entry before publishing. `ready_to_create` and `ready_with_matches` rows are eligible for
          the batch transaction.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[0.68rem] uppercase tracking-terminal text-muted">
            <tr>
              <th className="px-3 py-3">Member atom</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Cost</th>
              <th className="px-3 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => {
              const previewImageUrl = resolveIntuitionImageUrl(row.payload.row.selectedAtom?.image);
              const isCsvRow = row.payload.row.sourceLine !== undefined;

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 align-top text-ink">
                    <div className="flex gap-3">
                      {!isCsvRow && previewImageUrl ? (
                        <img src={previewImageUrl} alt="" className="mt-1 h-12 w-12 rounded-lg border border-line/70 object-cover" />
                      ) : null}
                      <div className="space-y-1">
                        {isCsvRow ? (
                          <p className="text-[0.64rem] uppercase tracking-terminal text-muted">
                            CSV input · line {row.payload.row.sourceLine}
                          </p>
                        ) : null}
                        <p>{row.payload.row.memberName || row.payload.row.selectedAtom?.label || row.label}</p>
                        {row.payload.row.memberDescription ? (
                          <p className="max-w-sm text-[0.78rem] leading-6 text-muted">{row.payload.row.memberDescription}</p>
                        ) : null}
                        {isCsvRow && row.payload.row.selectedAtom ? (
                          <div className="mt-2 flex items-center gap-2 text-[0.72rem] leading-5 text-muted">
                            {previewImageUrl ? (
                              <img src={previewImageUrl} alt="" className="h-7 w-7 rounded-md border border-line/70 object-cover" />
                            ) : null}
                            <span>
                              Resolved to <span className="text-ink">{row.payload.row.selectedAtom.label}</span> ·{' '}
                              {row.payload.row.selectedAtom.type}
                            </span>
                          </div>
                        ) : null}
                        {row.payload.row.resolutionNote ? (
                          <p className="text-[0.72rem] leading-5 text-muted">{row.payload.row.resolutionNote}</p>
                        ) : null}
                        {row.payload.prepared ? (
                          <p className="break-all font-mono text-[0.72rem] leading-5 text-muted">{row.payload.prepared.tripleId}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <ReviewStatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    {row.payload.prepared ? `${Number.parseFloat(formatEther(row.payload.prepared.assetWei)).toFixed(3).replace(/\.?0+$/, '')} ${nativeSymbol}` : '—'}
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    <p>{row.message}</p>
                    {row.payload.errors?.length ? (
                      <div className="mt-1 space-y-1">
                        {row.payload.errors.map((error) => (
                          <p key={`${row.id}-${error}`} className="text-[#8a4b38]">
                            {error}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {(row.status === 'ambiguous' || row.status === 'ready_with_matches') &&
                    row.payload.row.candidates.length > 0 &&
                    onSelectCandidate ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[0.68rem] uppercase tracking-terminal text-muted">
                          Compare {row.payload.row.candidates.length} exact-name options · hover, focus, or tap for details
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {row.payload.row.candidates.map((candidate, index) => (
                            <CandidateOption
                              key={`${row.id}-${candidate.termId}`}
                              atom={candidate}
                              index={index}
                              isSelected={row.payload.row.selectedAtom?.termId === candidate.termId}
                              onSelect={(atom) => onSelectCandidate(row.id, atom)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {(row.status === 'ambiguous' || row.status === 'missing' || row.status === 'invalid') && onRemoveRow ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onRemoveRow(row.id)}
                          className="rounded-full border border-line bg-white/80 px-3 py-1.5 text-[0.72rem] text-muted transition-colors duration-150 hover:text-ink"
                        >
                          Remove row
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
