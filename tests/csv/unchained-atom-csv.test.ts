import test from 'node:test';
import assert from 'node:assert/strict';

import { CLASSIFICATION_SPECS } from '@0xintuition/classifications';

import { parseUnchainedAtomCsvText } from '@/lib/csv/unchained-atom-csv';
import { getUnchainedAtomCsvTemplate } from '@/lib/csv/unchained-atom-templates';

test('every Unchained classification has a downloadable sample that parses cleanly', () => {
  assert.equal(CLASSIFICATION_SPECS.length, 37);

  for (const classification of CLASSIFICATION_SPECS) {
    const sample = getUnchainedAtomCsvTemplate(classification.slug);
    const parsed = parseUnchainedAtomCsvText(sample, classification.slug);

    assert.equal(parsed.rows.length, 1, classification.slug);
    assert.deepEqual(parsed.rows[0]?.errors, [], `${classification.slug}: ${parsed.rows[0]?.errors.join(' ')}`);
    assert.equal(parsed.rows[0]?.atom.classification, classification.slug);
    assert.match(sample.split('\n')[0] ?? '', /^classification,/);
  }
});

test('Unchained CSV reports missing required fields per row', () => {
  const result = parseUnchainedAtomCsvText('classification,givenName,familyName,deposit\nperson,Alex,,0', 'thing');

  assert.equal(result.rows.length, 1);
  assert.match(result.rows[0]?.errors.join(' ') ?? '', /familyName/);
});

test('Unchained CSV rejects unsupported populated columns instead of dropping data', () => {
  const result = parseUnchainedAtomCsvText('classification,name,image_url\nthing,Apple,https://example.com/apple.png', 'thing');

  assert.match(result.rows[0]?.errors.join(' ') ?? '', /image_url.*not part/i);
});

test('Unchained CSV can mix classifications when unrelated columns are blank', () => {
  const result = parseUnchainedAtomCsvText(
    'classification,name,description,givenName,familyName\nthing,Apple,A fruit,,\nperson,,,Alex,Rivera',
    'thing',
  );

  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map((row) => row.errors), [[], []]);
});

test('Unchained CSV accepts a readable classification label as well as a slug', () => {
  const result = parseUnchainedAtomCsvText('classification,givenName,familyName\nPerson,Alex,Rivera', 'thing');

  assert.equal(result.rows[0]?.atom.classification, 'person');
  assert.deepEqual(result.rows[0]?.errors, []);
});

test('Unchained CSV detects duplicate normalized headers and malformed rows', () => {
  assert.throws(
    () => parseUnchainedAtomCsvText('classification,givenName,given_name\nperson,Alex,Alex', 'person'),
    /duplicate headers/i,
  );

  const result = parseUnchainedAtomCsvText('classification,name\nthing,"Apple, fruit",extra', 'thing');
  assert.match(result.rows[0]?.errors.join(' ') ?? '', /more cells than the header/i);
});
