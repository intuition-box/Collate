'use client';

import { useState } from 'react';

import { getAtomDisplayName } from '@/lib/intuition/atom-prepare';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import type { CsvAtomParseRow } from '@/types/atoms';

export function CsvAtomPreviewTable({ rows }: { rows: CsvAtomParseRow[] }) {
  return (
    <div className="min-w-0 rounded-[1.15rem] border border-dashed border-line bg-paper/60 p-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Parsed CSV rows</p>
        <p className="text-sm leading-7 text-muted">
          Preview the imported rows before running duplicate and existing-atom checks.
        </p>
      </div>
      <div className="mt-4 max-w-full overflow-x-auto">
        <table className="w-full min-w-[56rem] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-14" />
            <col className="w-[26%]" />
            <col className="w-32" />
            <col className="w-[36%]" />
            <col />
          </colgroup>
          <thead className="text-[0.68rem] uppercase tracking-terminal text-muted">
            <tr>
              <th className="px-3 py-3">Line</th>
              <th className="px-3 py-3">Atom</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Parse notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => {
              const previewImageUrl = resolveIntuitionImageUrl(row.atom.image);

              return (
                <tr key={row.atom.id}>
                  <td className="px-3 py-3 align-top text-muted">{row.atom.sourceLine}</td>
                  <td className="px-3 py-3 align-top text-ink">
                    <div className="min-w-0 space-y-1 break-words">
                      <p>{getAtomDisplayName(row.atom) || 'Untitled atom'}</p>
                      <p className="text-[0.72rem] leading-5 text-muted">
                        {row.atom.schemaType === 'Raw'
                          ? row.atom.rawData
                          : row.atom.schemaType === 'Account'
                            ? row.atom.accountAddress
                            : row.atom.description || row.atom.url || 'No extra metadata'}
                      </p>
                    </div>
                  </td>
                  <td className="break-words px-3 py-3 align-top text-muted">{row.atom.schemaType}</td>
                  <td className="px-3 py-3 align-top text-muted">
                    <CsvImagePreview imageValue={row.atom.image} previewImageUrl={previewImageUrl} />
                  </td>
                  <td className="break-words px-3 py-3 align-top text-muted">
                    {row.errors.length > 0 ? (
                      <div className="space-y-1">
                        {row.errors.map((error) => (
                          <p key={`${row.atom.id}-${error}`} className="text-[#8a4b38]">
                            {error}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p>{row.atom.image.trim() && !previewImageUrl ? 'Ready for chain review, but the image value cannot be previewed here.' : 'Ready for chain review.'}</p>
                    )}
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

function CsvImagePreview({
  imageValue,
  previewImageUrl,
}: {
  imageValue: string;
  previewImageUrl: string | null;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const trimmedImageValue = imageValue.trim();
  const canPreview = previewImageUrl && failedImageUrl !== previewImageUrl;

  if (canPreview) {
    return (
      <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-2xl border border-line/80 bg-white/75 p-2">
        <img
          src={previewImageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl border border-line/70 bg-paper object-cover"
          onError={() => {
            setFailedImageUrl(previewImageUrl);
          }}
        />
        <div className="min-w-0 space-y-1">
          <p className="text-[0.68rem] uppercase tracking-terminal text-[#1f8a62]">Preview ready</p>
          <p className="truncate text-[0.72rem] leading-5 text-muted" title={trimmedImageValue}>
            {trimmedImageValue}
          </p>
        </div>
      </div>
    );
  }

  if (trimmedImageValue) {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#d9b9aa] bg-[#fff8f4] p-3">
        <p className="text-[0.68rem] uppercase tracking-terminal text-[#8a4b38]">No preview</p>
        <p className="mt-1 line-clamp-2 break-all text-[0.72rem] leading-5 text-muted" title={trimmedImageValue}>{trimmedImageValue}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-line/80 bg-white/45 p-3 text-[0.72rem] uppercase tracking-terminal text-muted">
      No image
    </div>
  );
}
