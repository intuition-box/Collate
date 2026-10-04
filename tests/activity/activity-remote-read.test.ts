import assert from 'node:assert/strict';
import test from 'node:test';

import type { Hex } from 'viem';

import {
  readRemoteActivityItems,
  readRemoteActivitySummary,
  shouldReadRemoteActivity,
} from '../../lib/activity/remote-read';
import type { ActivityItemRecord, ConfirmedActivityItem } from '../../types/activity';

const atom: ActivityItemRecord = {
  id: '17',
  kind: 'atom',
  network: 'testnet',
  txHash: `0x${'a'.repeat(64)}` as Hex,
  creatorWallet: `0x${'b'.repeat(40)}` as Hex,
  protocolId: `0x${'c'.repeat(64)}` as Hex,
  subjectId: null,
  predicateId: null,
  objectId: null,
  blockNumber: '123',
  createdAt: '2026-09-30T00:00:00.000Z',
};

test('remote reads activate only in development without a database URL', () => {
  assert.equal(shouldReadRemoteActivity({ NODE_ENV: 'development' }), true);
  assert.equal(shouldReadRemoteActivity({ NODE_ENV: 'development', DATABASE_URL: '  ' }), true);
  assert.equal(shouldReadRemoteActivity({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://dev' }), false);
  assert.equal(shouldReadRemoteActivity({ NODE_ENV: 'production' }), false);
  assert.equal(shouldReadRemoteActivity({ NODE_ENV: 'test' }), false);
});

test('summary reads the deployed public API without forwarding cookies or credentials', async () => {
  let requestedUrl = '';
  const requests: RequestInit[] = [];
  const summary = {
    network: 'testnet',
    totals: { atoms: 3, claims: 1, listEntries: 1, standaloneClaims: 0, confirmedTransactions: 2 },
    leaderboard: [],
  };
  const result = await readRemoteActivitySummary('testnet', {
    origin: 'https://collate.example',
    fetcher: async (url, init) => {
      requestedUrl = url;
      requests.push(init);
      return Response.json(summary);
    },
  });

  assert.deepEqual(result, summary);
  assert.equal(requestedUrl, 'https://collate.example/api/activity/summary?network=testnet');
  const requestInit = requests[0];
  assert.ok(requestInit);
  assert.equal(requestInit.method, 'GET');
  assert.deepEqual(requestInit.headers, { Accept: 'application/json' });
  assert.equal(requestInit.cache, 'no-store');
  assert.equal(requestInit.redirect, 'error');
  assert.ok(requestInit.signal);
});

test('items keep filters and pagination while reusing current deployed display metadata', async () => {
  let requestedUrl = '';
  const enriched = { ...atom, display: { state: 'pending' as const } } satisfies ConfirmedActivityItem;
  const result = await readRemoteActivityItems(
    { network: 'testnet', kind: 'atom', wallet: atom.creatorWallet, cursor: '25', limit: 20 },
    {
      origin: 'https://collate.example',
      fetcher: async (url) => {
        requestedUrl = url;
        return Response.json({ items: [enriched], nextCursor: '17' });
      },
      enrichItems: async () => { throw new Error('Current display data should not be enriched twice.'); },
    },
  );

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, '/api/activity/items');
  assert.deepEqual([...url.searchParams.entries()], [
    ['network', 'testnet'],
    ['kind', 'atom'],
    ['wallet', atom.creatorWallet],
    ['cursor', '25'],
    ['limit', '20'],
  ]);
  assert.equal(result.items[0]?.display.state, 'pending');
  assert.equal(result.nextCursor, '17');
});

test('older deployed items without display metadata are enriched locally', async () => {
  let enrichedIds: string[] = [];
  const result = await readRemoteActivityItems(
    { network: null, kind: null, wallet: null, cursor: null, limit: 20 },
    {
      origin: 'https://collate.example',
      fetcher: async () => Response.json({ items: [atom], nextCursor: null }),
      enrichItems: async (items) => {
        enrichedIds = items.map((item) => item.id);
        return items.map((item) => ({ ...item, display: { state: 'pending' as const } }));
      },
    },
  );

  assert.deepEqual(enrichedIds, ['17']);
  assert.equal(result.items[0]?.display.state, 'pending');
  assert.equal(result.nextCursor, null);
});

test('bad origins and upstream failures cannot silently masquerade as activity data', async () => {
  await assert.rejects(() => readRemoteActivitySummary(null, {
    origin: 'http://collate.example',
    fetcher: async () => Response.json({}),
  }), /HTTPS origin/);
  await assert.rejects(() => readRemoteActivitySummary(null, {
    origin: 'https://collate.example/other',
    fetcher: async () => Response.json({}),
  }), /HTTPS origin/);
  await assert.rejects(() => readRemoteActivitySummary(null, {
    origin: 'https://collate.example',
    fetcher: async () => new Response('Unavailable', { status: 503 }),
  }), /HTTP 503/);
  await assert.rejects(() => readRemoteActivitySummary(null, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json({ unexpected: true }),
  }), /unexpected format/);
});
