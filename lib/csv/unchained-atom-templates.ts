import { CLASSIFICATION_SPECS, getClassification, type ClassificationFieldSpec } from '@0xintuition/classifications';

export const UNCHAINED_CLASSIFICATIONS = CLASSIFICATION_SPECS;

function sampleForField(field: ClassificationFieldSpec, displayName: string): string {
  const examples: Record<string, string> = {
    address: field.fieldType === 'address' ? '0x0000000000000000000000000000000000000001' : '123 Example Street',
    applicationCategory: 'Productivity',
    author: 'Alex Rivera',
    bestRating: '5',
    brand: 'Example Brand',
    byArtist: 'Example Artist',
    caption: 'An example image',
    chainId: '1',
    codeRepository: 'https://github.com/example/project',
    decimals: '18',
    description: `A short description of this ${displayName.toLowerCase()}.`,
    familyName: 'Rivera',
    givenName: 'Alex',
    headline: 'A guide to open knowledge',
    hiringOrganization: 'Example Studio',
    inAlbum: 'Example Album',
    isbn: '9780140328721',
    itemReviewed: 'Example Item',
    name: `Example ${displayName}`,
    operatingSystem: 'Android',
    platform: 'X',
    ratingValue: '4.5',
    reviewBody: 'A thoughtful review of the example item.',
    reviewCount: '12',
    sku: 'EXAMPLE-001',
    symbol: 'EXM',
    text: 'An example post or comment.',
    title: 'Community Builder',
    username: 'example_builder',
    worstRating: '1',
  };

  const example = examples[field.key];
  if (example) return example;
  if (field.fieldType === 'url' || field.fieldType === 'string[]') return 'https://example.com/reference';
  if (field.fieldType === 'iso-date') return '2026-01-15';
  if (field.fieldType === 'iso-datetime') return '2026-01-15T12:00:00Z';
  if (field.fieldType === 'number') return '4.5';
  if (field.fieldType === 'integer') return '1';
  if (field.fieldType === 'address') return '0x0000000000000000000000000000000000000001';
  return `Example ${field.label.toLowerCase()}`;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function getUnchainedAtomCsvTemplate(slug: string): string {
  const classification = getClassification(slug);

  if (!classification) {
    throw new Error(`Unknown Unchained classification: ${slug}.`);
  }

  const headers = ['classification', ...classification.fields.map((field) => field.key), 'deposit'];
  const values = [
    slug,
    ...classification.fields.map((field) => sampleForField(field, classification.displayName)),
    '0',
  ];

  return `${headers.map(csvCell).join(',')}\n${values.map(csvCell).join(',')}`;
}

export function downloadUnchainedAtomCsvTemplate(slug: string): void {
  const csv = getUnchainedAtomCsvTemplate(slug);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `collate-${slug}-atom-template.csv`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
