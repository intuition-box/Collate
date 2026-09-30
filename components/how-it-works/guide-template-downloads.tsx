'use client';

import Link from 'next/link';

import {
  downloadBasicAtomCsvTemplate,
  downloadListCsvTemplate,
  downloadSchemaAtomCsvTemplate,
} from '@/lib/csv/templates';
import type { GuideStepAction } from '@/lib/how-it-works/guides';
import { getCreateFlowHref } from '@/lib/navigation/create-flow';

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 16h12" />
    </svg>
  );
}

const downloadButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

export function GuideTemplateDownloads({ action }: { action: GuideStepAction }) {
  if (action === 'list-csv-template') {
    return (
      <div className="mt-4">
        <button type="button" onClick={downloadListCsvTemplate} className={downloadButtonClass}>
          <DownloadIcon />
          Download list CSV sample
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadBasicAtomCsvTemplate} className={downloadButtonClass}>
          <DownloadIcon />
          Basic Classic CSV
        </button>
        <button type="button" onClick={downloadSchemaAtomCsvTemplate} className={downloadButtonClass}>
          <DownloadIcon />
          Mixed-type Classic CSV
        </button>
      </div>
      <p className="text-xs leading-5 text-muted">
        Using Unchained Early access?{' '}
        <Link href={getCreateFlowHref('csv-atoms')} className="font-medium text-ink underline underline-offset-4">
          Choose a type in CSV import
        </Link>{' '}
        to download its matching sample.
      </p>
    </div>
  );
}
