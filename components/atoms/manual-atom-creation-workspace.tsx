'use client';

import { useState } from 'react';

import { ManualBatchAtomsFlow } from '@/components/atoms/manual-batch-atoms-flow';
import { UnchainedManualAtomsFlow } from '@/components/atoms/unchained-manual-atoms-flow';

export function ManualAtomCreationWorkspace({ mode }: { mode: 'single' | 'batch' }) {
  const [format, setFormat] = useState<'unchained' | 'classic'>('unchained');

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line/80 px-6 py-4 sm:px-8">
        <button
          type="button"
          aria-pressed={format === 'unchained'}
          onClick={() => setFormat('unchained')}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${format === 'unchained' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-muted hover:text-ink'}`}
        >
          Unchained types
        </button>
        <button
          type="button"
          aria-pressed={format === 'classic'}
          onClick={() => setFormat('classic')}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${format === 'classic' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-muted hover:text-ink'}`}
        >
          Classic
        </button>
        <p className="w-full text-sm leading-6 text-muted">
          Unchained provides 37 canonical atom types. Classic preserves image uploads and established rich-metadata atoms.
        </p>
      </div>
      <div hidden={format !== 'unchained'}><UnchainedManualAtomsFlow mode={mode} active={format === 'unchained'} /></div>
      <div hidden={format !== 'classic'}><ManualBatchAtomsFlow mode={mode} active={format === 'classic'} /></div>
    </div>
  );
}
