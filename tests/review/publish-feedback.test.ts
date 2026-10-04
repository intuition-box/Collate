import assert from 'node:assert/strict';
import test from 'node:test';

import { getPublishFeedback } from '@/lib/utils/publish-feedback';
import type { WriteResult } from '@/types/writes';

const confirmedAtom: WriteResult = {
  kind: 'created',
  txHash: '0x1234',
  createdIds: ['0x01'],
  skippedIds: [],
};

test('confirmed atom and list writes produce clear singular and plural feedback', () => {
  assert.deepEqual(getPublishFeedback(confirmedAtom, 'atom'), {
    title: '1 atom created',
    count: 1,
    txHash: '0x1234',
  });

  assert.deepEqual(getPublishFeedback({ ...confirmedAtom, createdIds: ['0x01', '0x02'] }, 'list_entry'), {
    title: '2 list members added',
    count: 2,
    txHash: '0x1234',
  });
});

test('only confirmed writes with created IDs and a transaction can show success', () => {
  for (const kind of ['skipped', 'no_write_needed', 'failed'] as const) {
    assert.equal(getPublishFeedback({ ...confirmedAtom, kind }, 'atom'), null);
  }
  assert.equal(getPublishFeedback({ kind: 'created', createdIds: ['0x01'], skippedIds: [] }, 'atom'), null);
  assert.equal(getPublishFeedback({ ...confirmedAtom, createdIds: [] }, 'atom'), null);
});
