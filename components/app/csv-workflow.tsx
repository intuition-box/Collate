'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import type { CsvWorkflowStage } from '@/lib/utils/csv-workflow-state';

function focusReview(review: HTMLDivElement) {
  review.focus({ preventScroll: true });
  review.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function useCsvReviewNavigation(isReviewing: boolean, hasReview: boolean, hasError: boolean) {
  const reviewRef = useRef<HTMLDivElement>(null);
  const navigationPending = useRef(false);

  useEffect(() => {
    if (!navigationPending.current || !(isReviewing || hasReview || hasError) || !reviewRef.current) return;

    navigationPending.current = false;
    focusReview(reviewRef.current);
  }, [isReviewing, hasReview, hasError]);

  return {
    reviewRef,
    showReview: () => { if (reviewRef.current) focusReview(reviewRef.current); },
    navigateToReview: () => { navigationPending.current = true; },
  };
}

export function CsvReviewPrompt({ rowCount, description, reviewed, children }: {
  rowCount: number;
  description: string;
  reviewed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/15 bg-paper/70 p-5">
      <div className="min-w-0 space-y-1">
        <p className="text-xs uppercase tracking-terminal text-muted">{reviewed ? 'Preview' : 'Next step'}</p>
        <h2 className="text-base font-medium text-ink">{rowCount} {rowCount === 1 ? 'row' : 'rows'} in your preview</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

const stages: { id: CsvWorkflowStage; label: string }[] = [
  { id: 'prepare', label: 'Prepare' },
  { id: 'preview', label: 'Preview' },
  { id: 'review', label: 'Review' },
  { id: 'publish', label: 'Publish' },
];

export function CsvWorkflowProgress({
  activeStage,
  finished = false,
}: {
  activeStage: CsvWorkflowStage;
  finished?: boolean;
}) {
  const activeIndex = stages.findIndex((stage) => stage.id === activeStage);
  const progress = finished ? 100 : (activeIndex / (stages.length - 1)) * 100;

  return (
    <nav
      aria-label="CSV workflow progress"
      data-finished={finished ? 'true' : undefined}
      className="csv-workflow-progress relative rounded-2xl border border-line/80 bg-paper/65 px-3 py-4 sm:px-6"
    >
      <div aria-hidden="true" className="csv-workflow-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <ol className="relative grid grid-cols-4 gap-1">
        {stages.map((stage, index) => {
          const complete = finished || index < activeIndex;
          const current = !finished && index === activeIndex;

          return (
            <li
              key={stage.id}
              aria-current={current ? 'step' : undefined}
              className="flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                  complete
                    ? finished
                      ? 'border-accent bg-accent text-ink'
                      : 'border-ink/35 bg-paper text-ink'
                    : current
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-paper text-muted'
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-xs sm:text-sm ${current ? 'font-medium text-ink' : complete ? 'text-ink' : 'text-muted'}`}>
                {stage.label}
              </span>
              <span className="sr-only">
                {complete ? 'Complete' : current ? 'Current step' : 'Upcoming'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CsvReviewLoadingPanel({
  kind,
  rowCount,
  networkName,
}: {
  kind: 'atoms' | 'list members';
  rowCount: number;
  networkName: string;
}) {
  const description = kind === 'atoms'
    ? 'Preparing atom details and checking for existing matches.'
    : 'Matching member atoms and checking whether these entries are already in the selected list.';

  return (
    <section
      role="status"
      aria-live="polite"
      className="csv-review-panel grid items-center gap-6 rounded-[1.15rem] border border-line/80 p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(18rem,1.1fr)] sm:p-7"
    >
      <div className="relative z-10 space-y-3">
        <p className="text-xs uppercase tracking-terminal text-muted">Review in progress</p>
        <h2 className="text-xl font-medium tracking-tight text-ink sm:text-2xl">
          Checking {rowCount} {kind === 'atoms' ? 'atom' : 'list member'} {rowCount === 1 ? 'row' : 'rows'}
        </h2>
        <p className="max-w-lg text-sm leading-6 text-muted">{description}</p>
        <p className="inline-flex rounded-full border border-line/80 bg-paper/70 px-3 py-1 text-xs text-muted">
          {networkName}
        </p>
      </div>

      <div aria-hidden="true" className="csv-review-art">
        <div className="csv-review-rows">
          {[0, 1, 2].map((row) => (
            <div className={`csv-review-row csv-review-row-${row + 1}`} key={row}>
              <span className="csv-review-row-dot" />
              <span className="csv-review-row-line csv-review-row-line-long" />
              <span className="csv-review-row-line csv-review-row-line-short" />
            </div>
          ))}
        </div>
        <div className="csv-review-converge">
          <span />
        </div>
        <div className="csv-review-result">
          <span />
        </div>
      </div>
    </section>
  );
}
