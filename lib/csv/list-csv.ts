import { findDuplicateHeaders, findHeaderIndex, parseCsvRows, slugifyCsvHeader } from '@/lib/csv/parse-csv';
import { MAX_CREATION_ITEMS_PER_TRANSACTION } from '@/lib/intuition/write-limits';
import { createLocalId } from '@/lib/utils/ids';
import type { CsvListParseRow, ListMemberRow } from '@/types/lists';

export const MAX_LIST_BATCH_SIZE = MAX_CREATION_ITEMS_PER_TRANSACTION;

export function parseCsvListText(
  text: string,
  maxBatchSize = MAX_LIST_BATCH_SIZE,
): { rows: ListMemberRow[]; parsedRows: CsvListParseRow[]; errors: string[] } {
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    throw new Error('CSV is empty.');
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new Error('CSV is empty.');
  }

  const headers = headerRow.map(slugifyCsvHeader);
  const duplicateHeaders = findDuplicateHeaders(headers);
  const memberHeaderIndex = findHeaderIndex(headers, ['subject_name', 'subjectname', 'name', 'member', 'atom', 'label', 'subject']);
  const descriptionHeaderIndex = findHeaderIndex(headers, ['subject_description', 'subjectdescription', 'description', 'summary']);

  if (duplicateHeaders.length > 0) {
    throw new Error(`CSV contains duplicate headers: ${duplicateHeaders.join(', ')}.`);
  }

  if (memberHeaderIndex === -1) {
    throw new Error('CSV must include a subject_name column. name, member, atom, label, and subject are also accepted.');
  }

  const parsedRows: ListMemberRow[] = [];
  const rowResults: CsvListParseRow[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((cells, rowIndex) => {
    const memberName = (cells[memberHeaderIndex] ?? '').trim();
    const memberDescription = descriptionHeaderIndex === -1 ? '' : (cells[descriptionHeaderIndex] ?? '').trim();
    const sourceLine = rowIndex + 2;

    const row: ListMemberRow = {
      id: createLocalId('list-member'),
      sourceLine,
      memberName,
      memberDescription,
      selectedAtom: null,
      candidates: [],
    };

    parsedRows.push(row);
    rowResults.push({
      row,
      errors: memberName ? [] : ['Member name is required.'],
    });
  });

  if (parsedRows.every((row) => !row.memberName.trim())) {
    throw new Error('CSV did not contain any usable members.');
  }

  if (parsedRows.length > maxBatchSize) {
    rowResults.slice(maxBatchSize).forEach((entry) => {
      entry.errors.push(`CSV import is limited to ${maxBatchSize} list entries per transaction.`);
    });
  }

  return { rows: parsedRows, parsedRows: rowResults, errors };
}
