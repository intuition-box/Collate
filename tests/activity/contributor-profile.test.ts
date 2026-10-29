import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import type { Hex } from 'viem';

import { GET as getSummary } from '../../app/api/activity/contributors/[address]/summary/route';
import { GET as getPublishes } from '../../app/api/activity/publishes/route';
import { buildContributorSummaryQueries } from '../../lib/activity/contributor-summary';
import { buildActivityPublishesQuery } from '../../lib/activity/publishes-query';
import { readRemoteActivityPublishes, readRemoteContributorSummary } from '../../lib/activity/remote-read';
import { getContributorHref, parseContributorNetwork } from '../../lib/contributors/routes';

const wallet = `0x${'a'.repeat(40)}` as Hex;
const otherWallet = `0x${'b'.repeat(40)}` as Hex;

test('contributor links prioritize Mainnet unless a source network is explicit', () => {
  assert.equal(parseContributorNetwork(undefined), 'mainnet');
  assert.equal(parseContributorNetwork('invalid'), 'mainnet');
  assert.equal(parseContributorNetwork('testnet'), 'testnet');
  assert.equal(parseContributorNetwork('all'), 'all');
  assert.equal(getContributorHref(wallet, 'testnet'), `/contributors/${wallet}?network=testnet`);
  assert.equal(getContributorHref(wallet, 'all'), `/contributors/${wallet}?network=all`);
});

test('summary queries count only confirmed Collate records for one case-insensitive wallet', () => {
  const queries = buildContributorSummaryQueries(wallet, 'testnet');
  assert.match(queries.items.text, /publish\.status = 'confirmed'/);
  assert.match(queries.items.text, /LOWER\(item\.creator_wallet\) = LOWER\(\$1\)/);
  assert.match(queries.items.text, /item\.network = \$2/);
  assert.match(queries.items.text, /item_kind IN \('list_entry', 'claim'\)/);
  assert.match(queries.items.text, /item_kind = 'list_entry'/);
  assert.match(queries.publishes.text, /publish\.status = 'confirmed'/);
  assert.match(queries.publishes.text, /LOWER\(publish\.expected_wallet\) = LOWER\(\$1\)/);
  assert.match(queries.publishes.text, /publish\.network = \$2/);
  assert.deepEqual(queries.items.values, [wallet, 'testnet']);
  assert.deepEqual(queries.publishes.values, [wallet, 'testnet']);
  assert.deepEqual(buildContributorSummaryQueries(wallet, null).items.values, [wallet]);
});

test('wallet-filtered publish pages retain confirmed ordering and cursor pagination', () => {
  const cursor = '11111111-1111-4111-8111-111111111111';
  const query = buildActivityPublishesQuery({ network: 'mainnet', wallet, cursor, limit: 20 });
  assert.match(query.text, /publish\.status = 'confirmed'/);
  assert.match(query.text, /LOWER\(publish\.expected_wallet\) = LOWER\(\$2\)/);
  assert.match(query.text, /cursor_publish\.id = \$3::uuid/);
  assert.match(query.text, /ORDER BY publish\.block_timestamp DESC, publish\.id DESC/);
  assert.deepEqual(query.values, ['mainnet', wallet, cursor, 21]);
});

test('invalid wallet and network filters are rejected before database access', async () => {
  assert.equal((await getSummary(new NextRequest('http://localhost/api/activity/contributors/bad/summary'), { params: { address: 'bad' } })).status, 400);
  assert.equal((await getSummary(new NextRequest(`http://localhost/api/activity/contributors/${wallet}/summary?network=wrong`), { params: { address: wallet } })).status, 400);
  assert.equal((await getPublishes(new NextRequest('http://localhost/api/activity/publishes?wallet=bad'))).status, 400);
});

test('local read fallback refuses old or mismatched wallet publish responses', async () => {
  const filters = { network: 'mainnet' as const, wallet, cursor: null, limit: 20 };
  let requestedUrl = '';
  const fetcher = async (url: string) => {
    requestedUrl = url;
    return Response.json({ publishes: [], nextCursor: null });
  };
  await assert.rejects(() => readRemoteActivityPublishes(filters, { origin: 'https://collate.example', fetcher }), /unexpected format/);
  assert.equal(new URL(requestedUrl).searchParams.get('wallet'), wallet);
  await assert.rejects(() => readRemoteActivityPublishes(filters, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json({ wallet: otherWallet, publishes: [], nextCursor: null }),
  }), /unexpected format/);
  const result = await readRemoteActivityPublishes(filters, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json({ wallet: wallet.toUpperCase(), publishes: [], nextCursor: null }),
  });
  assert.deepEqual(result.publishes, []);
});

test('local summary fallback validates the requested wallet, network and exact totals', async () => {
  const summary = { wallet, network: 'all', atoms: 4, claims: 3, listEntries: 2, publishes: 2 };
  const result = await readRemoteContributorSummary(wallet, null, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json(summary),
  });
  assert.deepEqual(result, summary);
  await assert.rejects(() => readRemoteContributorSummary(wallet, null, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json({ ...summary, wallet: otherWallet }),
  }), /unexpected format/);
  await assert.rejects(() => readRemoteContributorSummary(wallet, null, {
    origin: 'https://collate.example',
    fetcher: async () => Response.json({ ...summary, claims: -1 }),
  }), /unexpected format/);
});
