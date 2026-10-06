import assert from 'node:assert/strict';
import test from 'node:test';

import { buildActivityItemsQuery } from '../../lib/activity/items-query';

test('recent activity sorts by numeric database ID, not its text projection', () => {
  const query = buildActivityItemsQuery({ network: 'mainnet', kind: null, wallet: null, cursor: null, limit: 20 });

  assert.match(query.text, /activity\.id::text AS id/);
  assert.match(query.text, /ORDER BY activity\.id DESC/);
  assert.deepEqual(query.values, ['mainnet', 21]);
});

test('recent activity applies filters and cursor to the same numeric ID column', () => {
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
  assert.match(query.text, /activity\.id < \$4/);
  assert.match(query.text, /ORDER BY activity\.id DESC\s+LIMIT \$5/);
  assert.deepEqual(query.values, [
    'mainnet',
    'atom',
    '0xC6bEBCb97251aE10d889038F6Cfe7BeA6a2F1629',
    '334',
    21,
  ]);
});
