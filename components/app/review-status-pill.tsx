import type { ReviewStatus } from '@/types/review';

const STATUS_CLASSNAMES: Record<ReviewStatus, string> = {
  ready_to_create: 'border-success/20 bg-success/10 text-success',
  ready_with_matches: 'border-warning/25 bg-success/10 text-warning',
  existing: 'border-line bg-white/80 text-muted',
  skip_existing: 'border-line bg-paper/80 text-muted',
  blocked_duplicate: 'border-warning/20 bg-warning/10 text-warning',
  ambiguous: 'border-warning/20 bg-warning/10 text-warning',
  missing: 'border-danger/20 bg-danger/10 text-danger',
  invalid: 'border-danger/20 bg-danger/10 text-danger',
};

export function ReviewStatusPill({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-terminal ${STATUS_CLASSNAMES[status]}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
