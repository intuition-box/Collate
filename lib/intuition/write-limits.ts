export const MAX_CREATION_ITEMS_PER_TRANSACTION = 50;

export function assertCreationBatchSize(count: number, itemLabel: 'atoms' | 'list entries'): void {
  if (count > MAX_CREATION_ITEMS_PER_TRANSACTION) {
    throw new Error(
      `A transaction can contain at most ${MAX_CREATION_ITEMS_PER_TRANSACTION} ${itemLabel}. Publish a smaller batch, then start another.`,
    );
  }
}
