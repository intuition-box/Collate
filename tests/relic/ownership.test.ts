import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import { getAddress, type Address } from 'viem';

import { POST } from '@/app/api/relic/ownership/route';
import { collectActivityWallets, chunkActivityWallets } from '@/lib/relic/activity-wallets';
import { createRelicOwnershipLookup } from '@/lib/relic/ownership';
import { parseRelicAddresses } from '@/lib/relic/validation';
import type { ActivityPublish, ActivitySummaryResponse } from '@/types/activity';

const HOLDER = '0x1111111111111111111111111111111111111111' as Address;
const NONHOLDER = '0x2222222222222222222222222222222222222222' as Address;
const UNAVAILABLE = '0x3333333333333333333333333333333333333333' as Address;

test('Relic balance lookup distinguishes holders, nonholders, and unavailable results', async () => {
  const lookup = createRelicOwnershipLookup(async () => [2n, 0n, null]);
  assert.deepEqual(await lookup([HOLDER, NONHOLDER, UNAVAILABLE]), {
    [HOLDER.toLowerCase()]: true,
    [NONHOLDER.toLowerCase()]: false,
    [UNAVAILABLE.toLowerCase()]: null,
  });
});

test('successful ownership is cached for five minutes and refreshed after a transfer', async () => {
  let now = 1_000;
  let calls = 0;
  const lookup = createRelicOwnershipLookup(async () => {
    calls += 1;
    return [calls === 1 ? 1n : 0n];
  }, { now: () => now });

  assert.equal((await lookup([HOLDER]))[HOLDER.toLowerCase()], true);
  now += 5 * 60 * 1000 - 1;
  assert.equal((await lookup([HOLDER]))[HOLDER.toLowerCase()], true);
  assert.equal(calls, 1);
  now += 1;
  assert.equal((await lookup([HOLDER]))[HOLDER.toLowerCase()], false);
  assert.equal(calls, 2);
});

test('failed and timed out reads never become a nonholder result or a cached result', async () => {
  let calls = 0;
  const lookup = createRelicOwnershipLookup(async () => {
    calls += 1;
    if (calls === 1) throw new Error('RPC failed');
    return [1n];
  });
  assert.equal((await lookup([HOLDER]))[HOLDER.toLowerCase()], null);
  assert.equal((await lookup([HOLDER]))[HOLDER.toLowerCase()], true);
  assert.equal(calls, 2);

  const timeout = createRelicOwnershipLookup(() => new Promise(() => {}), { timeoutMs: 5 });
  assert.equal((await timeout([NONHOLDER]))[NONHOLDER.toLowerCase()], null);
});

test('address validation bounds requests and normalizes duplicates', async () => {
  assert.deepEqual(parseRelicAddresses([HOLDER, HOLDER]), [HOLDER]);
  const lower = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert.deepEqual(parseRelicAddresses([lower, getAddress(lower)]), [getAddress(lower)]);
  assert.throws(() => parseRelicAddresses([]), /1 to 50/);
  assert.throws(() => parseRelicAddresses(Array(51).fill(HOLDER)), /1 to 50/);
  assert.throws(() => parseRelicAddresses(['not-an-address']), /valid wallet/);

  const request = (addresses: unknown) => new NextRequest('http://localhost/api/relic/ownership', {
    method: 'POST', body: JSON.stringify({ addresses }),
  });
  assert.equal((await POST(request([]))).status, 400);
  assert.equal((await POST(request(Array(51).fill(HOLDER)))).status, 400);
  assert.equal((await POST(request(['not-an-address']))).status, 400);
});

test('Activity lookup covers leaderboard and loaded publishes, independent of their network', () => {
  const summary = { leaderboard: [{ wallet: HOLDER }] } as ActivitySummaryResponse;
  const publishes = [
    { creatorWallet: HOLDER, network: 'mainnet' },
    { creatorWallet: NONHOLDER, network: 'testnet' },
  ] as ActivityPublish[];
  assert.deepEqual(collectActivityWallets(summary, publishes), [HOLDER.toLowerCase(), NONHOLDER.toLowerCase()]);
  assert.deepEqual(chunkActivityWallets(Array(51).fill(HOLDER), 50).map((chunk) => chunk.length), [50, 1]);
});
