export type CsvWorkflowStage = 'prepare' | 'preview' | 'review' | 'publish';

export function getCsvWorkflowStage({
  hasPreview,
  isReviewing,
  hasReview,
  reviewStarted = false,
  reviewFailed = false,
}: {
  hasPreview: boolean;
  isReviewing: boolean;
  hasReview: boolean;
  reviewStarted?: boolean;
  reviewFailed?: boolean;
}): CsvWorkflowStage {
  if (!hasPreview) return 'prepare';
  if (isReviewing || reviewFailed) return 'review';
  if (hasReview) return 'publish';
  if (reviewStarted) return 'review';
  return 'preview';
}
