'use client';

import { formatEther } from 'viem';

import { ReviewStatusPill } from '@/components/app/review-status-pill';
import { getAtomDisplayName } from '@/lib/intuition/atom-prepare';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import type { AtomReviewRow } from '@/types/atoms';

export function AtomReviewTable({
  rows,
  nativeSymbol,
}: {
  rows: AtomReviewRow[];
  nativeSymbol: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-line bg-paper/60 p-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Batch review</p>
        <p className="text-sm leading-7 text-muted">
          Review each row before publishing. Only `ready_to_create` rows are eligible for the batch transaction.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[0.68rem] uppercase tracking-terminal text-muted">
            <tr>
              <th className="px-3 py-3">Atom</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Cost</th>
              <th className="px-3 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => {
              const sourceLine =
                'sourceLine' in row.payload.draft && typeof row.payload.draft.sourceLine === 'number'
                  ? row.payload.draft.sourceLine
                  : null;
              const previewImageUrl = resolveIntuitionImageUrl(row.payload.draft.image);

              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 align-top text-ink">
                    <div className="flex gap-3">
                      {previewImageUrl ? (
                        <img
                          src={previewImageUrl}
                          alt=""
                          className="mt-1 h-12 w-12 rounded-lg border border-line/70 object-cover"
                        />
                      ) : null}
                      <div className="space-y-1">
                        <p>{getAtomDisplayName(row.payload.draft) || row.label}</p>
                        {sourceLine !== null ? (
                          <p className="text-[0.72rem] leading-5 text-muted">CSV line {sourceLine}</p>
                        ) : null}
                        {row.payload.prepared ? (
                          <p className="break-all font-mono text-[0.72rem] leading-5 text-muted">{row.payload.prepared.atomId}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-muted">{row.payload.draft.schemaType}</td>
                  <td className="px-3 py-3 align-top">
                    <ReviewStatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    {row.payload.prepared ? `${Number.parseFloat(formatEther(row.payload.prepared.assetWei)).toFixed(3).replace(/\.?0+$/, '')} ${nativeSymbol}` : '—'}
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    <p>{row.message}</p>
                    {row.payload.draft.image.trim() && !previewImageUrl ? (
                      <p className="mt-1 text-dangerInk">Image preview is unavailable because the image value is not a supported URL or IPFS reference.</p>
                    ) : null}
                    {row.payload.errors?.length ? (
                      <div className="mt-1 space-y-1">
                        {row.payload.errors.map((error) => (
                          <p key={error} className="break-words text-dangerInk [overflow-wrap:anywhere]">{error}</p>
                        ))}
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
