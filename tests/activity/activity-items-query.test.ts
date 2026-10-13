import assert from 'node:assert/strict';
import test from 'node:test';

import { buildActivityItemsQuery } from '../../lib/activity/items-query';

test('recent activity sorts by block time with numeric ID as a stable tie-breaker', () => {
  const query = buildActivityItemsQuery({ network: 'mainnet', kind: null, wallet: null, cursor: null, limit: 20 });

  assert.match(query.text, /activity\.id::text AS id/);
  assert.match(query.text, /ORDER BY activity\.created_at DESC, activity\.id DESC/);
  assert.doesNotMatch(query.text, /JOIN collate_activity_items AS cursor_item/);
  assert.deepEqual(query.values, ['mainnet', 21]);
});

test('recent activity loads older block times and uses ID to break timestamp ties', () => {
  const query = buildActivityItemsQuery({
    network: 'mainnet',
    kind: 'atom',
    wallet: '0xC6bEBCb97251aE10d889038F6Cfe7BeA6a2F1629',
    cursor: '334',
    limit: 20,
  });

  assert.match(query.text, /activity\.network = \$1/);
  assert.match(query.text, /activity\.item_kind = \$2/);
  assert.match(query.text, /LOWER\(activity\.creator_wallet\) = LOWER\(\$3\)/);
  assert.match(query.text, /JOIN collate_activity_items AS cursor_item ON cursor_item\.id = \$4/);
  assert.match(query.text, /\(activity\.created_at, activity\.id\) < \(cursor_item\.created_at, cursor_item\.id\)/);
  assert.match(query.text, /ORDER BY activity\.created_at DESC, activity\.id DESC\s+LIMIT \$5/);
  assert.deepEqual(query.values, [
    'mainnet',
    'atom',
    '0xC6bEBCb97251aE10d889038F6Cfe7BeA6a2F1629',
    '334',
    21,
  ]);
});

test('an unfiltered page uses the same chronological cursor order', () => {
  const query = buildActivityItemsQuery({ network: null, kind: null, wallet: null, cursor: '91', limit: 50 });

  assert.match(query.text, /cursor_item\.id = \$1/);
  assert.match(query.text, /\(activity\.created_at, activity\.id\) < \(cursor_item\.created_at, cursor_item\.id\)/);
  assert.match(query.text, /ORDER BY activity\.created_at DESC, activity\.id DESC\s+LIMIT \$2/);
  assert.deepEqual(query.values, ['91', 51]);
});
