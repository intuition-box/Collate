import assert from 'node:assert/strict';
import test from 'node:test';

import type { Hex } from 'viem';

import { getPublishPreview, getPublishTitle } from '../../lib/activity/publish-copy';
import {
  buildActivityPublishesQuery,
  buildPublishItemsQuery,
  buildPublishPreviewItemsQuery,
} from '../../lib/activity/publishes-query';
import { assembleActivityPublishes } from '../../lib/activity/publishes';
import type { ActivityPublish, ConfirmedActivityItem } from '../../types/activity';

const PUBLISH_ID = '11111111-1111-4111-8111-111111111111';
const ATOM_ID = `0x${'a'.repeat(64)}` as Hex;
const atom: ConfirmedActivityItem = {
  id: '7', kind: 'atom', network: 'testnet', txHash: ATOM_ID,
  creatorWallet: `0x${'b'.repeat(40)}` as Hex, protocolId: ATOM_ID,
  subjectId: null, predicateId: null, objectId: null,
  blockNumber: '123', createdAt: '2026-10-14T10:00:00.000Z',
  display: { state: 'ready', atom: { label: 'Knowledge Garden', type: 'Thing', image: null, description: 'A shared place.', url: null } },
};

function publish(overrides: Partial<ActivityPublish> = {}): ActivityPublish {
  return {
    id: PUBLISH_ID, network: 'testnet', txHash: atom.txHash, creatorWallet: atom.creatorWallet,
    kind: 'atom', sourceFlow: 'csv_atoms', itemCount: 12, createdAt: atom.createdAt,
    previewItems: [atom], ...overrides,
  };
}

test('publish pages sort by block time and stable transaction ID, not item insertion', () => {
  const first = buildActivityPublishesQuery({ network: 'testnet', cursor: null, limit: 20 });
  assert.match(first.text, /publish\.status = 'confirmed'/);
  assert.match(first.text, /publish\.network = \$1/);
  assert.match(first.text, /ORDER BY publish\.block_timestamp DESC, publish\.id DESC/);
  assert.doesNotMatch(first.text, /collate_activity_items/);
  assert.deepEqual(first.values, ['testnet', 21]);

  const next = buildActivityPublishesQuery({ network: null, cursor: PUBLISH_ID, limit: 20 });
  assert.match(next.text, /cursor_publish\.id = \$1::uuid/);
  assert.match(next.text, /\(publish\.block_timestamp, publish\.id\) < \(cursor_publish\.block_timestamp, cursor_publish\.id\)/);
  assert.deepEqual(next.values, [PUBLISH_ID, 21]);
});

test('preview fetch is capped per publish and expansion pages within one publish', () => {
  const preview = buildPublishPreviewItemsQuery([PUBLISH_ID, '22222222-2222-4222-8222-222222222222']);
  assert.match(preview.text, /JOIN LATERAL/);
  assert.match(preview.text, /WHERE transaction_id = chosen\.id/);
  assert.match(preview.text, /ORDER BY item_index ASC\s+LIMIT \$2/);
  assert.match(preview.text, /ORDER BY chosen\.position, activity\.item_index ASC/);
  assert.deepEqual(preview.values[1], 3);

  const first = buildPublishItemsQuery(PUBLISH_ID, null, 25);
  assert.match(first.text, /activity\.transaction_id = \$1::uuid/);
  assert.doesNotMatch(first.text, /item_index >/);
  assert.deepEqual(first.values, [PUBLISH_ID, 26]);

  const next = buildPublishItemsQuery(PUBLISH_ID, 24, 25);
  assert.match(next.text, /activity\.item_index > \$2::integer/);
  assert.match(next.text, /ORDER BY activity\.item_index ASC\s+LIMIT \$3/);
  assert.deepEqual(next.values, [PUBLISH_ID, 24, 26]);
});

test('previews stay attached to their publish while feed pages count transactions', () => {
  const otherId = '22222222-2222-4222-8222-222222222222';
  const base = {
    network: 'testnet' as const,
    tx_hash: atom.txHash,
    expected_wallet: atom.creatorWallet,
    item_kind: 'atom' as const,
    source_flow: 'csv_atoms' as const,
    expected_item_count: 12,
    block_timestamp: atom.createdAt,
  };
  const grouped = assembleActivityPublishes(
    [{ ...base, id: PUBLISH_ID }, { ...base, id: otherId, expected_item_count: 1 }],
    [{ transactionId: PUBLISH_ID, item: atom }, { transactionId: otherId, item: { ...atom, id: '8' } }],
  );

  assert.equal(grouped.length, 2);
  assert.equal(grouped[0]?.itemCount, 12);
  assert.deepEqual(grouped[0]?.previewItems.map((item) => item.id), ['7']);
  assert.deepEqual(grouped[1]?.previewItems.map((item) => item.id), ['8']);
});

test('batch summary keeps meaningful names and list context without exposing IDs', () => {
  assert.equal(getPublishTitle(publish()), 'Published 12 atoms');
  assert.equal(getPublishPreview(publish()), 'Knowledge Garden · +11 more');

  const listItem: ConfirmedActivityItem = {
    ...atom, kind: 'list_entry',
    display: {
      state: 'ready',
      triple: {
        subject: { label: 'Netflix', type: 'Thing', image: null, description: null, url: null },
        predicate: null,
        object: { label: 'Watchlist', type: 'Thing', image: null, description: null, url: null },
      },
    },
  };
  assert.equal(getPublishTitle(publish({ kind: 'list_entry', itemCount: 4, previewItems: [listItem] })), 'Added 4 members to Watchlist');
  assert.equal(getPublishPreview(publish({ kind: 'list_entry', itemCount: 4, previewItems: [listItem] })), 'Netflix · +3 more');
  assert.equal(getPublishTitle(publish({ kind: 'atom', itemCount: 1 })), 'Published 1 atom');
  assert.equal(getPublishPreview(publish({ previewItems: [] })), 'Item details are becoming available.');
});
