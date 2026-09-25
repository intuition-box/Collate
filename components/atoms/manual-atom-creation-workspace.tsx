'use client';

import { useState } from 'react';

import { ManualBatchAtomsFlow } from '@/components/atoms/manual-batch-atoms-flow';
import { UnchainedManualAtomsFlow } from '@/components/atoms/unchained-manual-atoms-flow';

export function ManualAtomCreationWorkspace({ mode }: { mode: 'single' | 'batch' }) {
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
          Classic
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
          Classic is the established image-rich format on Mainnet and Testnet. Unchained offers 37 structured types in early access on Testnet.
        </p>
      </div>
      <div hidden={format !== 'unchained'}><UnchainedManualAtomsFlow mode={mode} active={format === 'unchained'} /></div>
      <div hidden={format !== 'classic'}><ManualBatchAtomsFlow mode={mode} active={format === 'classic'} /></div>
    </div>
  );
}
