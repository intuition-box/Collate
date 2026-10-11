export const MAX_CREATION_ITEMS_PER_TRANSACTION = 50;
export const MAX_PRIVILEGED_CREATION_ITEMS = 150;

export function assertCreationBatchSize(count: number, itemLabel: 'atoms' | 'list entries', limit = MAX_CREATION_ITEMS_PER_TRANSACTION): void {
  if (!Number.isInteger(limit) || limit < 2 || limit > MAX_PRIVILEGED_CREATION_ITEMS) {
    throw new Error('The batch limit is invalid. Refresh the page before publishing.');
  }
  if (count > limit) {
    throw new Error(
      `A transaction can contain at most ${limit} ${itemLabel}. Publish a smaller batch, then start another.`,
    );
  }
}
