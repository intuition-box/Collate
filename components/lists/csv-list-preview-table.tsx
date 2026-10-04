'use client';

import type { CsvListParseRow } from '@/types/lists';

export function CsvListPreviewTable({ rows }: { rows: CsvListParseRow[] }) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-line bg-paper/60 p-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Parsed CSV rows</p>
        <p className="text-sm leading-7 text-muted">
          Preview the imported member rows before exact-match resolution and duplicate review.
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[0.68rem] uppercase tracking-terminal text-muted">
            <tr>
              <th className="px-3 py-3">Line</th>
              <th className="px-3 py-3">Member</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Parse notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((entry) => (
              <tr key={entry.row.id}>
                <td className="px-3 py-3 align-top text-muted">{entry.row.sourceLine ?? '—'}</td>
                <td className="px-3 py-3 align-top text-ink">{entry.row.memberName || 'Missing member name'}</td>
                <td className="px-3 py-3 align-top text-muted">{entry.row.memberDescription || '—'}</td>
                <td className="px-3 py-3 align-top text-muted">
                  {entry.errors.length > 0 ? (
                    <div className="space-y-1">
                      {entry.errors.map((error) => (
                        <p key={`${entry.row.id}-${error}`} className="text-dangerInk">
                          {error}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p>Ready for resolution.</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
