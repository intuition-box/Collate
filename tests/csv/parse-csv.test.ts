import test from 'node:test';
import assert from 'node:assert/strict';

import { findDuplicateHeaders, parseCsvRows, slugifyCsvHeader } from '@/lib/csv/parse-csv';
import { parseCsvAtomText } from '@/lib/csv/atom-csv';
import { parseCsvListText } from '@/lib/csv/list-csv';

test('parseCsvRows handles quoted commas and escaped quotes', () => {
  const rows = parseCsvRows('name,description\n"Acme, Inc.","Says ""hello"""');

  assert.deepEqual(rows, [
    ['name', 'description'],
    ['Acme, Inc.', 'Says "hello"'],
  ]);
});

test('parseCsvRows rejects unclosed quotes', () => {
  assert.throws(() => parseCsvRows('name\n"Acme'), /unclosed quoted value/i);
});

test('findDuplicateHeaders detects duplicate normalized headers', () => {
  const duplicates = findDuplicateHeaders(['name', slugifyCsvHeader('Name'), 'description']);

  assert.deepEqual(duplicates, ['name']);
});

test('parseCsvAtomText maps schema defaults and required fields', () => {
  const result = parseCsvAtomText('name,description\nAcme,Trusted builder', 'Thing');

  assert.equal(result.atoms.length, 1);
  assert.equal(result.rows.length, 1);
  assert.equal(result.atoms[0]?.schemaType, 'Thing');
  assert.equal(result.atoms[0]?.name, 'Acme');
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.rows[0]?.errors, []);
});

test('parseCsvAtomText accepts the basic atom template shape', () => {
  const result = parseCsvAtomText(
    [
      'name,description,url,image_url,deposit',
      'Apple,A sweet pome fruit,https://en.wikipedia.org/wiki/Apple,,0',
    ].join('\n'),
    'Thing',
  );

  assert.equal(result.atoms.length, 1);
  assert.equal(result.atoms[0]?.schemaType, 'Thing');
  assert.equal(result.atoms[0]?.name, 'Apple');
  assert.equal(result.atoms[0]?.url, 'https://en.wikipedia.org/wiki/Apple');
  assert.equal(result.atoms[0]?.support, '0');
  assert.deepEqual(result.rows[0]?.errors, []);
});

test('parseCsvAtomText captures row-level validation errors without throwing', () => {
  const result = parseCsvAtomText('schema_type,account_address\nAccount,not-an-address', 'Thing');

  assert.equal(result.rows.length, 1);
  assert.match(result.rows[0]?.errors[0] ?? '', /valid EVM address/i);
});

test('parseCsvAtomText rejects when no usable atom column exists', () => {
  assert.throws(() => parseCsvAtomText('description\nMissing name'), /must include at least a name/i);
});

test('parseCsvAtomText rejects duplicate headers', () => {
  assert.throws(() => parseCsvAtomText('name,Name\nAlpha,Beta'), /duplicate headers/i);
});

test('parseCsvAtomText ignores whitespace-only rows', () => {
  const result = parseCsvAtomText('name,description\nAlpha,One\n   ,   \nBeta,Two');

  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]?.atom.name, 'Alpha');
  assert.equal(result.rows[1]?.atom.name, 'Beta');
});

test('parseCsvAtomText flags malformed image references as row errors', () => {
  const result = parseCsvAtomText('name,image_url\nAlpha,not-a-url');

  assert.match(result.rows[0]?.errors[0] ?? '', /valid image url or ipfs reference/i);
});

test('parseCsvListText accepts common member headers', () => {
  const result = parseCsvListText('member,description\nEthereum,Layer one');

  assert.equal(result.rows.length, 1);
  assert.equal(result.parsedRows.length, 1);
  assert.equal(result.rows[0]?.memberName, 'Ethereum');
  assert.equal(result.rows[0]?.memberDescription, 'Layer one');
  assert.equal(result.rows[0]?.deposit, '');
  assert.deepEqual(result.parsedRows[0]?.errors, []);
});

test('parseCsvListText accepts blank, zero, and decimal extra deposits', () => {
  const result = parseCsvListText([
    'member,description,deposit',
    'Blank,No extra support,',
    'Zero,No extra support,0',
    'Quarter,Adds support,0.25',
    'Exact trailing zeros,Still exact,0.2500000000000000000',
  ].join('\n'));

  assert.deepEqual(result.rows.map((row) => row.deposit), ['', '0', '0.25', '0.2500000000000000000']);
  assert.ok(result.parsedRows.every((row) => row.errors.length === 0));
});

test('parseCsvListText rejects negative, malformed, and over-precision deposits by row', () => {
  const result = parseCsvListText([
    'member,description,deposit',
    'Negative,Invalid,-0.1',
    'Malformed,Invalid,not an amount',
    'Precise,Invalid,0.0000000000000000001',
    'Precise without leading zero,Invalid,.0000000000000000001',
  ].join('\n'));

  assert.equal(result.parsedRows.length, 4);
  assert.ok(result.parsedRows.every((row) => row.errors.some((error) => /deposit must be a non-negative TRUST amount/i.test(error))));
});

test('parseCsvListText rejects duplicate headers', () => {
  assert.throws(() => parseCsvListText('member,Member\nAlpha,Beta'), /duplicate headers/i);
});

test('parseCsvListText captures missing member names as row-level errors', () => {
  const result = parseCsvListText('member,description\n   ,Layer one\nBase,Layer two');

  assert.equal(result.parsedRows.length, 2);
  assert.match(result.parsedRows[0]?.errors[0] ?? '', /member name is required/i);
  assert.deepEqual(result.parsedRows[1]?.errors, []);
});
