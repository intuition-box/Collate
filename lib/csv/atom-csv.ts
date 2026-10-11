import { createEmptyAtomDraft, isRichAtomSchemaType, validateAtomDraft } from '@/lib/intuition/atom-prepare';
import { findDuplicateHeaders, findHeaderIndex, parseCsvRows, slugifyCsvHeader } from '@/lib/csv/parse-csv';
import { MAX_CREATION_ITEMS_PER_TRANSACTION } from '@/lib/intuition/write-limits';
import { createLocalId } from '@/lib/utils/ids';
import type { AtomSchemaType, CsvAtomParseRow, CsvAtomRow } from '@/types/atoms';

export const MAX_CSV_BATCH_SIZE = MAX_CREATION_ITEMS_PER_TRANSACTION;

export function normalizeCsvSchemaType(value: string): AtomSchemaType | null {
  const normalized = slugifyCsvHeader(value);

  if (!normalized) return null;
  if (normalized === 'thing') return 'Thing';
  if (normalized === 'person') return 'Person';
  if (normalized === 'organization') return 'Organization';
  if (normalized === 'account' || normalized === 'caip10' || normalized === 'account_caip10') return 'Account';
  if (normalized === 'raw' || normalized === 'raw_data' || normalized === 'uri' || normalized === 'data') return 'Raw';

  return null;
}

export function mapCsvRecordToAtom(
  values: Record<string, string>,
  sourceLine: number,
  defaultSchemaType: AtomSchemaType,
): { atom: CsvAtomRow; errors: string[] } {
  const schemaType = normalizeCsvSchemaType(values.schema_type ?? '');
  const errors: string[] = [];

  if (values.schema_type?.trim() && !schemaType) {
    errors.push('schema_type must be Thing, Person, Organization, Account, or Raw.');
  }

  const resolvedSchemaType = schemaType ?? defaultSchemaType;
  const atom: CsvAtomRow = {
    ...createEmptyAtomDraft(createLocalId('csv-atom')),
    sourceLine,
    sourceRecord: values,
    schemaType: resolvedSchemaType,
    name: values.name?.trim() ?? '',
    description: values.description?.trim() ?? '',
    url: values.url?.trim() ?? '',
    image: (values.image_url ?? values.image ?? '').trim(),
    support: (values.deposit ?? '').trim(),
    email: values.email?.trim() ?? '',
    identifier: values.identifier?.trim() ?? '',
    accountChainId: (values.account_chain_id ?? values.chain_id ?? '1').trim() || '1',
    accountAddress: (values.account_address ?? values.address ?? '').trim(),
    rawData: (values.raw_data ?? values.data ?? '').trim(),
  };

  if (resolvedSchemaType === 'Account' && !atom.accountAddress && values.name?.trim()) {
    atom.accountAddress = values.name.trim();
  }

  if (resolvedSchemaType === 'Raw' && !atom.rawData && values.name?.trim()) {
    atom.rawData = values.name.trim();
  }

  if (isRichAtomSchemaType(resolvedSchemaType) && !atom.name) {
    errors.push('name is required for Thing, Person, and Organization atoms.');
  }

  if (resolvedSchemaType === 'Account' && !atom.accountAddress) {
    errors.push('account_address is required for Account atoms.');
  }

  if (resolvedSchemaType === 'Raw' && !atom.rawData) {
    errors.push('raw_data is required for Raw atoms.');
  }

  return { atom, errors };
}

export function parseCsvAtomText(
  text: string,
  defaultSchemaType: AtomSchemaType = 'Thing',
): { atoms: CsvAtomRow[]; rows: CsvAtomParseRow[]; errors: string[] } {
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

  if (duplicateHeaders.length > 0) {
    throw new Error(`CSV contains duplicate headers: ${duplicateHeaders.join(', ')}.`);
  }

  if (
    findHeaderIndex(headers, ['name']) === -1 &&
    findHeaderIndex(headers, ['raw_data']) === -1 &&
    findHeaderIndex(headers, ['account_address']) === -1
  ) {
    throw new Error('CSV must include at least a name, raw_data, or account_address column.');
  }

  const atoms: CsvAtomRow[] = [];
  const parsedRows: CsvAtomParseRow[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((cells, rowIndex) => {
    const values = headers.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
      accumulator[header] = (cells[headerIndex] ?? '').trim();
      return accumulator;
    }, {});

    if (Object.values(values).every((value) => value === '')) {
      return;
    }

    const sourceLine = rowIndex + 2;
    const { atom, errors: rowErrors } = mapCsvRecordToAtom(values, sourceLine, defaultSchemaType);
    const validationErrors = validateAtomDraft(atom);
    atoms.push(atom);
    parsedRows.push({
      atom,
      errors: [...rowErrors, ...validationErrors],
    });
  });

  if (atoms.length === 0) {
    throw new Error('CSV did not contain any usable atoms.');
  }

  if (atoms.length > MAX_CSV_BATCH_SIZE) {
    parsedRows.slice(MAX_CSV_BATCH_SIZE).forEach((row) => {
      row.errors.push(`CSV import is limited to ${MAX_CSV_BATCH_SIZE} atoms per transaction.`);
    });
  }

  return { atoms, rows: parsedRows, errors };
}
