import type { Hex } from 'viem';

import type { ReviewRow, ReviewStatus } from '@/types/review';
import type { ListMemberRow, PreparedListEntry } from '@/types/lists';

export function isCreatableListReviewStatus(status: ReviewStatus): boolean {
  return status === 'ready_to_create' || status === 'ready_with_matches';
}

export function buildListReviewRows(
  rows: ListMemberRow[],
  preparedEntries: PreparedListEntry[],
): ReviewRow<PreparedListEntry>[] {
  const tripleCounts = new Map<Hex, number>();

  for (const entry of preparedEntries) {
    tripleCounts.set(entry.tripleId, (tripleCounts.get(entry.tripleId) ?? 0) + 1);
  }

  const rowMap = new Map(rows.map((row) => [row.id, row]));

  return preparedEntries.map((entry) => {
    const sourceRow = rowMap.get(entry.id);

    if (!sourceRow?.selectedAtom) {
      return {
        id: entry.id,
        label: sourceRow?.memberName || 'Unknown member',
        status: 'invalid',
        message: 'This list member has not been resolved to an atom.',
        payload: entry,
      };
    }

    if (entry.alreadyExistsOnChain) {
      return {
        id: entry.id,
        label: sourceRow.selectedAtom.label,
        status: 'skip_existing',
        message: 'This list entry already exists and will be skipped.',
        payload: entry,
      };
    }

    if ((tripleCounts.get(entry.tripleId) ?? 0) > 1) {
      return {
        id: entry.id,
        label: sourceRow.selectedAtom.label,
        status: 'blocked_duplicate',
        message: 'This member is duplicated in the current list batch.',
        payload: entry,
      };
    }

    if (sourceRow.candidates.length > 1) {
      return {
        id: entry.id,
        label: sourceRow.selectedAtom.label,
        status: 'ready_with_matches',
        message: 'This entry is ready to create, but other atoms share this name. Review the selected option if needed.',
        payload: entry,
      };
    }

    return {
      id: entry.id,
      label: sourceRow.selectedAtom.label,
      status: 'ready_to_create',
      message: 'This list entry is ready to create.',
      payload: entry,
    };
  });
}

export function filterCreatableListEntries(rows: ReviewRow<PreparedListEntry>[]): PreparedListEntry[] {
  return rows.filter((row) => isCreatableListReviewStatus(row.status)).map((row) => row.payload);
}
