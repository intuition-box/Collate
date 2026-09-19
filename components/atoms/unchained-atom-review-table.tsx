'use client';

import { getClassification } from '@0xintuition/classifications';
import { formatEther } from 'viem';

import { ReviewStatusPill } from '@/components/app/review-status-pill';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import type { UnchainedAtomReviewRow } from '@/types/atoms';

export function UnchainedAtomReviewTable({
  rows,
  nativeSymbol,
  onApproveDistinct,
}: {
  rows: UnchainedAtomReviewRow[];
  nativeSymbol: string;
  onApproveDistinct: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/80 bg-paper/60 p-4">
      <p className="mb-3 text-xs uppercase tracking-terminal text-muted">Atom review</p>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-muted">
            <th className="p-3">Atom</th>
            <th className="p-3">Status</th>
            <th className="p-3">Cost</th>
            <th className="p-3">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((row) => {
            const sourceLine = row.payload.draft.sourceLine;
            return (
              <tr key={row.id}>
                <td className="p-3 align-top text-ink">
                  <p>{row.label}</p>
                  <p className="text-xs text-muted">
                    {sourceLine ? `Line ${sourceLine} · ` : ''}{getClassification(row.payload.draft.classification)?.displayName ?? row.payload.draft.classification}
                  </p>
                  {row.payload.prepared ? <p className="mt-1 break-all font-mono text-xs text-muted">{row.payload.prepared.atomId}</p> : null}
                </td>
                <td className="p-3 align-top"><ReviewStatusPill status={row.status} /></td>
                <td className="p-3 align-top text-muted">
                  {row.payload.prepared ? `${Number.parseFloat(formatEther(row.payload.prepared.assetWei)).toFixed(3).replace(/\.?0+$/, '')} ${nativeSymbol}` : '—'}
                </td>
                <td className="min-w-64 p-3 align-top text-muted">
                  <p>{row.message}</p>
                  {row.payload.matches?.length ? (
                    <details className="mt-2 rounded-xl border border-line/80 bg-white/70 p-3">
                      <summary className="cursor-pointer text-sm text-ink">Compare {row.payload.matches.length} same-name atom{row.payload.matches.length === 1 ? '' : 's'}</summary>
                      <div className="mt-3 space-y-3">
                        {row.payload.matches.map((match) => {
                          const image = resolveIntuitionImageUrl(match.image);
                          return (
                            <div key={match.termId} className="rounded-lg border border-line/80 p-3">
                              <div className="flex gap-3">
                                {image ? <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-line/80 object-cover" /> : null}
                                <div className="min-w-0">
                                  <p className="font-medium text-ink">{match.label}</p>
                                  <p className="text-xs text-muted">{match.type}</p>
                                  <p className="mt-1 text-sm">{match.description || 'No description available.'}</p>
                                </div>
                              </div>
                              {match.url ? <p className="mt-2 break-all text-xs">{match.url}</p> : null}
                              {match.creatorLabel || match.creatorId ? <p className="mt-1 text-xs">Creator: {match.creatorLabel || match.creatorId}</p> : null}
                              <p className="mt-1 break-all font-mono text-xs">{match.termId}</p>
                            </div>
                          );
                        })}
                        {row.status === 'ambiguous' ? (
                          <button type="button" onClick={() => onApproveDistinct(row.id)} className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink">
                            I checked, create a distinct atom
                          </button>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
