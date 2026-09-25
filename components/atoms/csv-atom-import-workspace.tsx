'use client';

import { useState } from 'react';

import { CsvBatchAtomsFlow } from '@/components/atoms/csv-batch-atoms-flow';
import { UnchainedCsvAtomsFlow } from '@/components/atoms/unchained-csv-atoms-flow';

export function CsvAtomImportWorkspace() {
  const [format, setFormat] = useState<'unchained' | 'classic'>('classic');

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line/80 px-6 py-4 sm:px-8">
        <button
          type="button"
          aria-pressed={format === 'classic'}
          onClick={() => setFormat('classic')}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${format === 'classic' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-muted hover:text-ink'}`}
        >
          Classic CSV
        </button>
        <button
          type="button"
          aria-pressed={format === 'unchained'}
          onClick={() => setFormat('unchained')}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${format === 'unchained' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-muted hover:text-ink'}`}
        >
          <span>Unchained types</span>
          <span className="rounded-full border border-line/80 bg-paper/80 px-2 py-0.5 text-xs text-muted">
            Early access
          </span>
        </button>
        <p className="w-full text-sm leading-6 text-muted">
          Classic CSV is the established image-rich format on both networks. Unchained CSV offers classification-specific fields in early access on Testnet.
        </p>
      </div>
      <div hidden={format !== 'unchained'}><UnchainedCsvAtomsFlow active={format === 'unchained'} /></div>
      <div hidden={format !== 'classic'}><CsvBatchAtomsFlow /></div>
    </div>
  );
}
