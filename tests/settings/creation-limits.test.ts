import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import { encodeFunctionData, type Hex } from 'viem';

import { POST as createIntent } from '@/app/api/activity/intent/route';
import { GET as getAdminSettingsRoute, PUT as updateAdminSettingsRoute } from '@/app/api/admin/settings/route';
import { GET as getCreationLimitsRoute } from '@/app/api/settings/creation-limits/route';
import { createAdminSessionToken } from '@/lib/admin/auth';
import { decodeActivityCalldata } from '@/lib/activity/calldata';
import { enqueueActivityConfirmation, flushActivityOutbox, isActivityConfirmationPending } from '@/lib/activity/client';
import { parseCsvAtomText } from '@/lib/csv/atom-csv';
import { parseCsvListText } from '@/lib/csv/list-csv';
import { parseUnchainedAtomCsvText } from '@/lib/csv/unchained-atom-csv';
import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { getHasTagPredicateTermId } from '@/lib/intuition/list-predicate';
import { publishManualBatchAtoms } from '@/lib/intuition/manual-batch-atoms';
import { prepareCreateAtomsTransaction, prepareCreateTriplesTransaction } from '@/lib/intuition/tx-prepare';
import { MAX_PRIVILEGED_CREATION_ITEMS } from '@/lib/intuition/write-limits';
import { DEFAULT_ADMIN_SETTINGS, resolveCreationLimits, validateAdminSettings } from '@/lib/settings/creation-limits';
import type { PreparedAtomDraft } from '@/types/atoms';
import type { PreparedListEntry } from '@/types/lists';

const WALLET = '0x1111111111111111111111111111111111111111';
const OTHER_WALLET = '0x2222222222222222222222222222222222222222';
const TERM = `0x${'aa'.repeat(32)}` as Hex;

test('admin batch settings enforce bounds, normalize wallets, and resolve both limits', () => {
  const settings = validateAdminSettings({
    ...DEFAULT_ADMIN_SETTINGS,
    atomLimit: 75,
    listLimit: 90,
    allowlistedWallets: [WALLET, WALLET.toUpperCase().replace('0X', '0x')],
  });
  assert.deepEqual(settings.allowlistedWallets, [WALLET]);
  assert.deepEqual(resolveCreationLimits(settings, WALLET), { atomLimit: 150, listLimit: 150 });
  assert.deepEqual(resolveCreationLimits(settings, OTHER_WALLET), { atomLimit: 75, listLimit: 90 });
  assert.deepEqual(resolveCreationLimits({ ...settings, allowlistedWallets: [] }, WALLET), { atomLimit: 75, listLimit: 90 });

  assert.throws(() => validateAdminSettings({ ...settings, atomLimit: 1 }), /2 to 100/);
  assert.throws(() => validateAdminSettings({ ...settings, listLimit: 101 }), /2 to 100/);
  assert.throws(() => validateAdminSettings({ ...settings, privilegedLimit: 151 }), /2 to 150/);
  assert.throws(() => validateAdminSettings({ ...settings, privilegedLimit: 89 }), /cannot be lower/);
  assert.throws(() => validateAdminSettings({ ...settings, atomLimit: 2.5 }), /whole number/);
  assert.throws(() => validateAdminSettings({ ...settings, allowlistedWallets: ['bad'] }), /valid Ethereum/);
});

test('settings routes do not expose private settings without an admin session', async () => {
  const request = new NextRequest('http://localhost/api/admin/settings');
  assert.equal((await getAdminSettingsRoute(request)).status, 401);
  assert.equal((await updateAdminSettingsRoute(new NextRequest('http://localhost/api/admin/settings', { method: 'PUT', body: '{}' }))).status, 401);

  const previousSecret = process.env.ADMIN_AUTH_SECRET;
  process.env.ADMIN_AUTH_SECRET = 'test-secret-for-admin-settings-longer-than-thirty-two';
  try {
    const invalid = await updateAdminSettingsRoute(new NextRequest('http://localhost/api/admin/settings', {
      method: 'PUT',
      headers: { cookie: `collate_admin_session=${createAdminSessionToken()}`, 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ ...DEFAULT_ADMIN_SETTINGS, atomLimit: 101 }),
    }));
    assert.equal(invalid.status, 400);
  } finally {
    if (previousSecret === undefined) delete process.env.ADMIN_AUTH_SECRET;
    else process.env.ADMIN_AUTH_SECRET = previousSecret;
  }
});

test('database-free development retains normal creation limits', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  Reflect.deleteProperty(process.env, 'DATABASE_URL');
  try {
    const response = await getCreationLimitsRoute(new NextRequest(`http://localhost/api/settings/creation-limits?address=${WALLET}`));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).limits, { atomLimit: 50, listLimit: 50 });
  } finally {
    if (previousDatabaseUrl !== undefined) process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('manual and CSV atom/list batches accept 150 only when passed the privileged cap', () => {
  const atoms: PreparedAtomDraft[] = Array.from({ length: 151 }, (_, index) => ({
    id: `atom-${index}`, displayName: `Atom ${index}`, dataString: `Atom ${index}`,
    atomId: TERM, assetWei: 1n, supportWei: 0n, existsOnChain: false,
  }));
  const entries: PreparedListEntry[] = Array.from({ length: 151 }, (_, index) => ({
    id: `entry-${index}`, listTermId: TERM, memberTermId: TERM, tripleId: TERM,
    assetWei: 1n, alreadyExistsOnChain: false,
  }));
  assert.equal(MAX_PRIVILEGED_CREATION_ITEMS, 150);
  assert.equal(prepareCreateAtomsTransaction(atoms.slice(0, 150), 150).value, 150n);
  assert.equal(prepareCreateTriplesTransaction(entries.slice(0, 150), 'testnet', 150).value, 150n);
  assert.throws(() => prepareCreateAtomsTransaction(atoms, 150), /at most 150 atoms/);
  assert.throws(() => prepareCreateTriplesTransaction(entries, 'testnet', 150), /at most 150 list entries/);
  assert.throws(() => prepareCreateAtomsTransaction(atoms.slice(0, 51), 50), /at most 50 atoms/);

  const classic = parseCsvAtomText(['name', ...atoms.map((atom) => atom.displayName)].join('\n'), 'Thing', 150);
  const unchained = parseUnchainedAtomCsvText(['classification,name', ...atoms.map((atom) => `thing,${atom.displayName}`)].join('\n'), 'thing', 150);
  const lists = parseCsvListText(['member', ...entries.map((_, index) => `Member ${index}`)].join('\n'), 150);
  assert.equal(classic.rows[149]?.errors.length, 0);
  assert.match(classic.rows[150]?.errors.join(' ') ?? '', /150/);
  assert.equal(unchained.rows[149]?.errors.length, 0);
  assert.match(unchained.rows[150]?.errors.join(' ') ?? '', /150/);
  assert.equal(lists.parsedRows[149]?.errors.length, 0);
  assert.match(lists.parsedRows[150]?.errors.join(' ') ?? '', /150/);
  assert.equal(decodeActivityCalldata(prepareCreateAtomsTransaction(atoms.slice(0, 150), 150).data, 'csv_atoms', 'testnet').itemCount, 150);
});

test('activity intent applies current wallet limit on both networks before storing', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
  const globalWithPool = globalThis as typeof globalThis & { collateDatabasePool?: unknown };
  const previousPool = globalWithPool.collateDatabasePool;
  let inserts = 0;
  let allowlisted = true;
  globalWithPool.collateDatabasePool = {
    query: async (sql: string) => {
      if (sql.startsWith('SELECT key')) return { rows: [
        { key: 'batch_allowlisted_wallets', value: allowlisted ? [WALLET] : [] },
      ] };
      if (sql.startsWith('INSERT INTO collate_activity_transactions')) { inserts += 1; return { rows: [] }; }
      throw new Error('Unexpected test query');
    },
  };
  try {
    const atomData = (count: number) => encodeFunctionData({
      abi: MULTIVAULT_ABI, functionName: 'createAtoms',
      args: [Array.from({ length: count }, () => '0x1234' as Hex), Array.from({ length: count }, () => 1n)],
    });
    const listData = (count: number, network: 'mainnet' | 'testnet') => encodeFunctionData({
      abi: MULTIVAULT_ABI, functionName: 'createTriples',
      args: [Array.from({ length: count }, () => TERM), Array.from({ length: count }, () => getHasTagPredicateTermId(network)), Array.from({ length: count }, () => TERM), Array.from({ length: count }, () => 1n)],
    });
    const submit = async (network: 'mainnet' | 'testnet', walletAddress: string, data: Hex, sourceFlow: 'csv_atoms' | 'csv_lists') =>
      createIntent(new NextRequest('http://localhost/api/activity/intent', {
        method: 'POST', body: JSON.stringify({ network, walletAddress, data, sourceFlow }),
      }));

    assert.equal((await submit('mainnet', WALLET, atomData(150), 'csv_atoms')).status, 201);
    assert.equal((await submit('testnet', WALLET, listData(150, 'testnet'), 'csv_lists')).status, 201);
    assert.equal((await submit('mainnet', WALLET, atomData(151), 'csv_atoms')).status, 403);
    assert.equal((await submit('testnet', OTHER_WALLET, listData(51, 'testnet'), 'csv_lists')).status, 403);
    allowlisted = false;
    assert.equal((await submit('mainnet', WALLET, atomData(51), 'csv_atoms')).status, 403);
    assert.equal(inserts, 2);
  } finally {
    globalWithPool.collateDatabasePool = previousPool;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('production refuses to request a wallet signature when the intent cannot be stored', async () => {
  const previousMode = process.env.NODE_ENV;
  const previousFetch = globalThis.fetch;
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true, configurable: true, enumerable: true });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Publishing is temporarily unavailable. No wallet request was sent.' }), { status: 503 });
  Object.defineProperty(globalThis, 'window', { value: { setTimeout, clearTimeout }, configurable: true });
  let walletPrompts = 0;
  try {
    await assert.rejects(() => publishManualBatchAtoms({
      atoms: [{ id: 'a', displayName: 'Atom', dataString: 'Atom', atomId: TERM, assetWei: 1n, supportWei: 0n, existsOnChain: false }],
      network: 'testnet',
      publicClient: {} as never,
      walletClient: { sendTransaction: async () => { walletPrompts += 1; return TERM; } } as never,
      walletAddress: WALLET,
      activityFlow: 'single_atom',
      limit: 50,
    }), /Publishing is temporarily unavailable/);
    assert.equal(walletPrompts, 0);
  } finally {
    if (previousMode === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Object.defineProperty(process.env, 'NODE_ENV', { value: previousMode, writable: true, configurable: true, enumerable: true });
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete (globalThis as typeof globalThis & { window?: unknown }).window;
    else Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
  }
});

test('broadcast hashes remain queued until activity confirmation succeeds', async () => {
  const previousFetch = globalThis.fetch;
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { value: {
    setTimeout, clearTimeout,
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    },
  }, configurable: true });
  let confirmationAttempts = 0;
  globalThis.fetch = async () => {
    confirmationAttempts += 1;
    return new Response(JSON.stringify(confirmationAttempts === 1
      ? { status: 'pending', itemCount: 0, retryable: true }
      : { status: 'confirmed', itemCount: 150, retryable: false }), { status: confirmationAttempts === 1 ? 202 : 200 });
  };
  try {
    const intentId = 'fa47dd4b-35d8-4d40-8af0-aaa788706188';
    assert.equal(enqueueActivityConfirmation({ intentId, network: 'mainnet', txHash: TERM }), true);
    await flushActivityOutbox();
    assert.equal(isActivityConfirmationPending(intentId), true);
    await flushActivityOutbox();
    assert.equal(isActivityConfirmationPending(intentId), false);
    assert.equal(confirmationAttempts, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete (globalThis as typeof globalThis & { window?: unknown }).window;
    else Object.defineProperty(globalThis, 'window', { value: previousWindow, configurable: true });
  }
});
