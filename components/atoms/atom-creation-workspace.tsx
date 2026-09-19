'use client';

import { useState } from 'react';

import { useSelectedNetwork } from '@/components/app/network-provider';
import { CsvAtomImportWorkspace } from '@/components/atoms/csv-atom-import-workspace';
import { ManualBatchAtomsFlow } from '@/components/atoms/manual-batch-atoms-flow';
import { CsvBatchListsFlow } from '@/components/lists/csv-batch-lists-flow';
import { ManualBatchListsFlow } from '@/components/lists/manual-batch-lists-flow';

type WorkspaceSection = 'atoms' | 'lists';
type AtomMode = 'single_atom' | 'batch_atoms' | 'csv_atoms';
type ListMode = 'manual_lists' | 'csv_lists';

export function AtomCreationWorkspace() {
  const { network } = useSelectedNetwork();
  const [section, setSection] = useState<WorkspaceSection>('atoms');
  const [atomMode, setAtomMode] = useState<AtomMode>('single_atom');
  const [listMode, setListMode] = useState<ListMode>('manual_lists');

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-white/82">
      <div className="space-y-3 px-6 py-3 sm:px-8 sm:py-4">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Create</p>
          <div className="inline-flex flex-wrap gap-1 rounded-[1.15rem] border border-line/80 bg-white p-1">
            {([
              ['atoms', 'Atom creation'],
              ['lists', 'Lists'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSection(value)}
                className={`rounded-[0.95rem] px-4 py-2 text-[0.95rem] transition-colors duration-150 ${
                  section === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="pl-1 sm:pl-2.5">
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">
              {section === 'atoms' ? 'Atom mode' : 'List mode'}
            </p>
            <div className="inline-flex flex-wrap gap-1 rounded-[1rem] border border-line/80 bg-white p-1">
              {section === 'atoms'
                ? ([
                    ['single_atom', 'Single atom'],
                    ['batch_atoms', 'Batch atoms'],
                    ['csv_atoms', 'CSV import'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAtomMode(value)}
                      className={`rounded-[0.85rem] px-3 py-1.5 text-[0.92rem] transition-colors duration-150 ${
                        atomMode === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))
                : ([
                    ['manual_lists', 'Manual lists'],
                    ['csv_lists', 'CSV import'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setListMode(value)}
                      className={`rounded-[0.85rem] px-3 py-1.5 text-[0.92rem] transition-colors duration-150 ${
                        listMode === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-0 py-0">
        {section === 'atoms' && atomMode === 'single_atom' ? <ManualBatchAtomsFlow key={`single-${network}`} mode="single" /> : null}
        {section === 'atoms' && atomMode === 'batch_atoms' ? <ManualBatchAtomsFlow key={`batch-${network}`} mode="batch" /> : null}
        {section === 'atoms' && atomMode === 'csv_atoms' ? <CsvAtomImportWorkspace key={`csv-atoms-${network}`} /> : null}
        {section === 'lists' && listMode === 'manual_lists' ? <ManualBatchListsFlow key={`lists-${network}`} /> : null}
        {section === 'lists' && listMode === 'csv_lists' ? <CsvBatchListsFlow key={`csv-lists-${network}`} /> : null}
      </div>
    </div>
  );
}
