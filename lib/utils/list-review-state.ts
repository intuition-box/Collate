interface ListReviewDisabledReasonOptions {
  hasListAtom: boolean;
  hasReviewableInput: boolean;
  isBusy: boolean;
  missingInputMessage: string;
}

export function getListReviewDisabledReason({
  hasListAtom,
  hasReviewableInput,
  isBusy,
  missingInputMessage,
}: ListReviewDisabledReasonOptions): string | null {
  if (!hasListAtom) {
    return 'Select or create a list atom before reviewing.';
  }

  if (!hasReviewableInput) {
    return missingInputMessage;
  }

  if (isBusy) {
    return 'Wait for the current operation to finish before reviewing again.';
  }

  return null;
}
