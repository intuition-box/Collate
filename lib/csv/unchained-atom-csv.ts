import { CLASSIFICATION_SPECS, getClassification, type ClassificationFieldSpec } from '@0xintuition/classifications';
import { buildAtom } from '@0xintuition/primitives/atom';

import { parseCsvRows } from '@/lib/csv/parse-csv';
import { createLocalId } from '@/lib/utils/ids';
import { parseOptionalSupport } from '@/lib/utils/validation';
import type { UnchainedCsvAtomParseRow } from '@/types/atoms';

export const MAX_UNCHAINED_CSV_BATCH_SIZE = 50;

export function normalizeUnchainedCsvHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveClassification(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (getClassification(normalized)) return normalized;
  return CLASSIFICATION_SPECS.find((item) => item.displayName.toLowerCase() === value.trim().toLowerCase())?.slug ?? normalized;
}

function parseFieldValue(field: ClassificationFieldSpec, value: string): unknown {
  if (field.fieldType === 'string[]') {
    return value.split('|').map((part) => part.trim()).filter(Boolean);
  }

  if (field.fieldType === 'number' || field.fieldType === 'integer') {
    return Number(value);
  }

  return value;
}

export function getUnchainedAtomDisplayName(values: Record<string, unknown>): string {
  const direct = values.name ?? values.headline ?? values.title ?? values.username ?? values.text ?? values.reviewBody ?? values.address;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const givenName = typeof values.givenName === 'string' ? values.givenName.trim() : '';
  const familyName = typeof values.familyName === 'string' ? values.familyName.trim() : '';
  if (givenName || familyName) return `${givenName} ${familyName}`.trim();

  if (values.ratingValue !== undefined) return `Rating ${String(values.ratingValue)}`;
  return 'Untitled atom';
}

export function parseUnchainedAtomCsvText(text: string, defaultClassification: string): {
  rows: UnchainedCsvAtomParseRow[];
} {
  const records = parseCsvRows(text);
  if (records.length < 2) throw new Error('CSV needs a header and at least one atom row.');

  const rawHeaders = records[0] ?? [];
  const normalizedHeaders = rawHeaders.map(normalizeUnchainedCsvHeader);
  const duplicates = normalizedHeaders.filter((header, index) => header && normalizedHeaders.indexOf(header) !== index);
  if (duplicates.length) throw new Error(`CSV contains duplicate headers: ${[...new Set(duplicates)].join(', ')}.`);

  const classificationIndex = normalizedHeaders.indexOf('classification');
  const depositIndex = normalizedHeaders.indexOf('deposit');
  const rows: UnchainedCsvAtomParseRow[] = [];

  for (const [index, cells] of records.slice(1).entries()) {
    if (cells.every((cell) => !cell.trim())) continue;

    const rawClassification = classificationIndex >= 0 ? cells[classificationIndex]?.trim() : '';
    const slug = resolveClassification(rawClassification || defaultClassification);
    const spec = getClassification(slug);
    const errors: string[] = [];
    const values: Record<string, unknown> = {};
    const knownHeaders = new Map(spec?.fields.map((field) => [normalizeUnchainedCsvHeader(field.key), field]) ?? []);

    if (!spec) errors.push(`Unknown classification "${slug}". Choose one of the Unchained types.`);
    if (cells.length > rawHeaders.length) errors.push('This row has more cells than the header. Quote values containing commas.');

    normalizedHeaders.forEach((header, headerIndex) => {
      const value = cells[headerIndex]?.trim() ?? '';
      if (!value) return;
      if (header === 'classification' || header === 'deposit') return;
      if (!header) {
        errors.push('A populated column has no header. Add a header or remove that value.');
        return;
      }

      const field = knownHeaders.get(header);
      if (!field) {
        errors.push(`Column "${rawHeaders[headerIndex]}" is not part of ${spec?.displayName ?? slug}.`);
        return;
      }

      values[field.key] = parseFieldValue(field, value);
    });

    const deposit = depositIndex >= 0 ? cells[depositIndex]?.trim() ?? '' : '';
    if (parseOptionalSupport(deposit) === null) errors.push('deposit must be a non-negative TRUST amount.');

    if (spec) {
      for (const field of spec.fields) {
        const value = values[field.key];
        if (field.fieldType === 'url' && typeof value === 'string' && !value.startsWith('https://')) {
          errors.push(`${field.key} must be a public HTTPS URL.`);
        }
        if (field.key === 'sameAs' && Array.isArray(value) && value.some((reference) => typeof reference !== 'string' || !reference.startsWith('https://'))) {
          errors.push('sameAs references must be public HTTPS URLs, separated by | when there are several.');
        }
      }

      const built = buildAtom(slug, values);
      if (!built.success) errors.push(...built.errors);
    }

    rows.push({
      atom: {
        id: createLocalId('unchained-csv-atom'),
        sourceLine: index + 2,
        classification: slug,
        values,
        deposit,
        sourceRecord: Object.fromEntries(rawHeaders.map((header, headerIndex) => [header, cells[headerIndex] ?? ''])),
      },
      errors: [...new Set(errors)],
    });
  }

  if (!rows.length) throw new Error('CSV did not contain any atom rows.');
  if (rows.length > MAX_UNCHAINED_CSV_BATCH_SIZE) {
    rows.slice(MAX_UNCHAINED_CSV_BATCH_SIZE).forEach((row) => {
      row.errors.push(`Import is limited to ${MAX_UNCHAINED_CSV_BATCH_SIZE} atoms per transaction.`);
    });
  }

  return { rows };
}
