import { reviewManualBatchLists } from '@/lib/intuition/manual-batch-lists';
import { searchAtoms } from '@/lib/intuition/search';
import { normalizeSearchText } from '@/lib/utils/validation';
import type { IntuitionAtomSearchResult, PublicIntuitionNetwork } from '@/types/api';
import type { CsvListParseRow, ListMemberRow, ManualListReviewRow } from '@/types/lists';

interface ResolveCsvListRowsOptions {
  rows: ListMemberRow[];
  network: PublicIntuitionNetwork;
  preferredCreatorAddress?: string | null;
}

interface ReviewCsvBatchListsOptions {
  listAtom: IntuitionAtomSearchResult | null;
  parsedRows: CsvListParseRow[];
  network: PublicIntuitionNetwork;
  publicClient: Parameters<typeof reviewManualBatchLists>[0]['publicClient'];
}

function normalizeDescription(value: string): string {
  return normalizeSearchText(value).replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function scoreStrongDescriptionMatch(candidateDescription: string | null, csvDescription: string): number {
  const candidate = normalizeDescription(candidateDescription ?? '');
  const target = normalizeDescription(csvDescription);

  if (!candidate || !target) {
    return 0;
  }

  if (candidate === target) {
    return 2;
  }

  const shorterLength = Math.min(candidate.length, target.length);
  const longerLength = Math.max(candidate.length, target.length);
  const hasStrongContainment =
    shorterLength >= 20 &&
    shorterLength / longerLength >= 0.6 &&
    (candidate.includes(target) || target.includes(candidate));

  return hasStrongContainment ? 1 : 0;
}

export function getExactLabelCandidates(
  candidates: IntuitionAtomSearchResult[],
  memberName: string,
): IntuitionAtomSearchResult[] {
  const normalizedName = normalizeSearchText(memberName);
  return candidates.filter((candidate) => normalizeSearchText(candidate.label) === normalizedName);
}

export function chooseUniqueCandidateByDescription(
  candidates: IntuitionAtomSearchResult[],
  csvDescription: string,
): IntuitionAtomSearchResult | null {
  if (!csvDescription.trim() || candidates.length < 2) {
    return null;
  }

  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreStrongDescriptionMatch(candidate.description, csvDescription),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
  const top = scored[0];
  const runnerUp = scored[1];

  if (!top || runnerUp?.score === top.score) {
    return null;
  }

  return top.candidate;
}

function buildCsvStatusRow(
  row: ListMemberRow,
  status: ManualListReviewRow['status'],
  message: string,
  errors?: string[],
): ManualListReviewRow {
  return {
    id: row.id,
    label: row.selectedAtom?.label ?? row.memberName.trim() ?? 'Unknown member',
    status,
    message,
    payload: {
      row,
      ...(errors ? { errors } : {}),
    },
  };
}

export async function resolveCsvListRows({
  rows,
  network,
  preferredCreatorAddress,
}: ResolveCsvListRowsOptions): Promise<ListMemberRow[]> {
  const resolvedRows: ListMemberRow[] = [];

  for (const row of rows) {
    if (!row.memberName.trim()) {
      resolvedRows.push({
        ...row,
        selectedAtom: null,
        candidates: [],
      });
      continue;
    }

    const results = await searchAtoms(network, row.memberName.trim(), true, 8, preferredCreatorAddress);
    const candidates = getExactLabelCandidates(results, row.memberName);
    const descriptionMatch = chooseUniqueCandidateByDescription(candidates, row.memberDescription);
    const safeMatch = candidates.length === 1 ? candidates[0] ?? null : descriptionMatch;
    const resolutionNote = row.selectedAtom
      ? row.resolutionNote
      : candidates.length === 1
        ? 'Resolved from one exact name match.'
        : descriptionMatch
          ? 'Resolved from a unique description match.'
          : null;

    resolvedRows.push({
      ...row,
      selectedAtom: row.selectedAtom ?? safeMatch,
      candidates,
      ...(resolutionNote ? { resolutionNote } : {}),
    });
  }

  return resolvedRows;
}

export async function reviewCsvBatchLists({
  listAtom,
  parsedRows,
  network,
  publicClient,
}: ReviewCsvBatchListsOptions): Promise<ManualListReviewRow[]> {
  if (!listAtom) {
    throw new Error('Select a list atom before reviewing CSV list entries.');
  }

  const invalidRows = new Map<string, ManualListReviewRow>();
  const unresolvedRows = new Map<string, ManualListReviewRow>();
  const resolvableRows: ListMemberRow[] = [];

  for (const parsedRow of parsedRows) {
    const { row, errors } = parsedRow;

    if (errors.length > 0) {
      invalidRows.set(row.id, buildCsvStatusRow(row, 'invalid', errors.join(' '), errors));
      continue;
    }

    if (row.selectedAtom) {
      resolvableRows.push(row);
      continue;
    }

    if (row.candidates.length > 1) {
      unresolvedRows.set(
        row.id,
        buildCsvStatusRow(row, 'ambiguous', 'This member matched multiple atoms. Select one candidate before publishing.'),
      );
      continue;
    }

    unresolvedRows.set(
      row.id,
      buildCsvStatusRow(row, 'missing', 'This member could not be resolved to an existing atom. Remove it or resolve it later.'),
    );
  }

  const reviewedResolvedRows =
    resolvableRows.length > 0
      ? await reviewManualBatchLists({
          listAtom,
          rows: resolvableRows,
          network,
          publicClient,
        })
      : [];

  return parsedRows.map(({ row }) => {
    return (
      invalidRows.get(row.id) ??
      unresolvedRows.get(row.id) ??
      reviewedResolvedRows.find((candidate) => candidate.id === row.id) ??
      buildCsvStatusRow(row, 'invalid', 'Review data missing.', ['Review data missing.'])
    );
  });
}
