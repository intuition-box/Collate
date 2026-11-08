import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { NextRequest } from 'next/server';
import { getAddress } from 'viem';

import { GET } from '@/app/api/activity/summary/route';
import { DEFAULT_ADMIN_SETTINGS } from '@/lib/settings/creation-limits';
import type { ActivitySummaryResponse } from '@/types/activity';

const wallet = (index: number): `0x${string}` => `0x${index.toString(16).padStart(40, '0')}`;
const EXCLUDED = `0x${'a'.repeat(40)}` as `0x${string}`;

test('production excludes wallets before the top-50 limit on every network without changing totals', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const globalWithPool = globalThis as typeof globalThis & { collateDatabasePool?: unknown };
  const previousPool = globalWithPool.collateDatabasePool;
  const leaderboardQueries: { sql: string; params: unknown[] }[] = [];
  process.env.DATABASE_URL = 'postgres://test:test@localhost/test';

  globalWithPool.collateDatabasePool = {
    query: async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT key')) {
        return { rows: [{ key: 'leaderboard_excluded_wallets', value: [getAddress(EXCLUDED)] }] };
      }
      if (sql.includes('FROM collate_activity_transactions')) return { rows: [{ count: '3' }] };
      if (sql.includes('GROUP BY item_kind')) {
        assert.doesNotMatch(sql, /LOWER\(creator_wallet\)/);
        return { rows: [{ item_kind: 'atom', count: '51' }, { item_kind: 'list_entry', count: '2' }] };
      }
      if (sql.includes('GROUP BY creator_wallet')) {
        leaderboardQueries.push({ sql, params });
        const excluded = new Set((params.at(-1) as string[]).map((address) => address.toLowerCase()));
        return {
          rows: [EXCLUDED, ...Array.from({ length: 50 }, (_, index) => wallet(index + 2))]
            .filter((address) => !excluded.has(address))
            .slice(0, 50)
            .map((creator_wallet) => ({ creator_wallet, atoms: '1', list_entries: '0', claims: '0', standalone_claims: '0', total: '1' })),
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  try {
    for (const network of ['mainnet', 'testnet', 'all'] as const) {
      const response = await GET(new NextRequest(`http://localhost/api/activity/summary?network=${network}`));
      assert.equal(response.status, 200);
      const summary = await response.json() as ActivitySummaryResponse;
      assert.equal(summary.network, network);
      assert.deepEqual(summary.totals, { atoms: 51, listEntries: 2, claims: 2, standaloneClaims: 0, confirmedTransactions: 3 });
      assert.equal(summary.leaderboard.length, 50);
      assert.equal(summary.leaderboard[0]?.wallet, wallet(2));
      assert.equal(summary.leaderboard[49]?.wallet, wallet(51));
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }

    assert.equal(leaderboardQueries.length, 3);
    for (const [index, { sql, params }] of leaderboardQueries.entries()) {
      assert.ok(sql.indexOf('LOWER(creator_wallet) <> ALL') < sql.indexOf('LIMIT 50'));
      assert.deepEqual(params, index === 2 ? [[EXCLUDED]] : [['mainnet', 'testnet'][index], [EXCLUDED]]);
    }
  } finally {
    globalWithPool.collateDatabasePool = previousPool;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('local live-summary fallback filters only leaderboard rows', async () => {
  const previous = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    fetch: globalThis.fetch,
  };
  const directory = await mkdtemp(join(tmpdir(), 'collate-leaderboard-'));
  process.chdir(directory);
  Reflect.set(process.env, 'NODE_ENV', 'development');
  delete process.env.DATABASE_URL;
  await writeFile(join(directory, '.collate-local-settings.json'), JSON.stringify({
    ...DEFAULT_ADMIN_SETTINGS,
    leaderboardExcludedWallets: [EXCLUDED],
  }));

  const liveSummary: ActivitySummaryResponse = {
    network: 'all',
    totals: { atoms: 2, listEntries: 0, claims: 0, standaloneClaims: 0, confirmedTransactions: 1 },
    leaderboard: [
      { wallet: getAddress(EXCLUDED), atoms: 1, listEntries: 0, claims: 0, standaloneClaims: 0, total: 1 },
      { wallet: wallet(2), atoms: 1, listEntries: 0, claims: 0, standaloneClaims: 0, total: 1 },
    ],
  };
  globalThis.fetch = async () => Response.json(liveSummary);

  try {
    const response = await GET(new NextRequest('http://localhost/api/activity/summary?network=all'));
    assert.equal(response.status, 200);
    const summary = await response.json() as ActivitySummaryResponse;
    assert.deepEqual(summary.totals, liveSummary.totals);
    assert.deepEqual(summary.leaderboard.map((entry) => entry.wallet), [wallet(2)]);
    assert.equal(liveSummary.leaderboard.length, 2);

    await writeFile(join(directory, '.collate-local-settings.json'), JSON.stringify({
      ...DEFAULT_ADMIN_SETTINGS,
      leaderboardExcludedWallets: [EXCLUDED, wallet(2)],
    }));
    const allExcluded = await GET(new NextRequest('http://localhost/api/activity/summary?network=all'));
    assert.equal(allExcluded.status, 200);
    assert.deepEqual((await allExcluded.json()).leaderboard, []);
  } finally {
    globalThis.fetch = previous.fetch;
    process.chdir(previous.cwd);
    if (previous.nodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', previous.nodeEnv);
    if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.databaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
});
