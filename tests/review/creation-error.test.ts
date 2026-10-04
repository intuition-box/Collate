import assert from 'node:assert/strict';
import test from 'node:test';

import { getReadableError } from '@/lib/utils/creation-error';

test('wallet rejection gets a short message with technical details available', () => {
  const raw = 'Atom publish failed: User rejected the request. Request Arguments: data: 0x123456 Version: viem@2.54.3';
  assert.deepEqual(getReadableError(raw), {
    summary: 'You declined the request in your wallet. Nothing was published.',
    details: raw,
  });
});

test('ordinary validation errors stay readable without duplicate details', () => {
  assert.deepEqual(getReadableError('Review the atom before publishing.'), {
    summary: 'Review the atom before publishing.',
    details: null,
  });
});

test('long unstructured errors are capped but remain available in full', () => {
  const raw = `Publish failed: ${'x'.repeat(190)}`;
  const result = getReadableError(raw);
  assert.ok(result.summary.length <= 180);
  assert.equal(result.details, raw);
});

test('uncertain confirmation does not claim that the transaction failed', () => {
  assert.match(getReadableError('Timed out while waiting for transaction receipt.').summary, /Check the transaction/);
});
