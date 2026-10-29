import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { GET, PATCH } from '@/app/api/admin/settings/route';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from '@/lib/admin/auth';
import { DEFAULT_ADMIN_SETTINGS } from '@/lib/settings/creation-limits';
import { isSettingsSectionDirty, mergeSavedSettings, parseSettingsSectionPatch, pickSettingsSection } from '@/lib/settings/sections';

const WALLET = '0x1111111111111111111111111111111111111111';

function sectionRequest(body: unknown, cookie?: string, fetchSite = 'same-origin') {
  return new NextRequest('http://localhost/api/admin/settings', {
    method: 'PATCH',
    headers: { ...(cookie ? { cookie } : {}), 'sec-fetch-site': fetchSite },
    body: JSON.stringify(body),
  });
}

test('section patches reject unknown fields and preserve drafts in other sections', () => {
  assert.deepEqual(parseSettingsSectionPatch({
    section: 'visibility', values: { showActivityInNav: false, showDiscoverInNav: true },
  }), { section: 'visibility', values: { showActivityInNav: false, showDiscoverInNav: true } });
  assert.throws(() => parseSettingsSectionPatch({ section: 'visibility', values: { showDiscoverInNav: true } }), /only the fields/);
  assert.throws(() => parseSettingsSectionPatch({ section: 'visibility', values: { showActivityInNav: false, showDiscoverInNav: true, atomLimit: 90 } }), /only the fields/);
  assert.throws(() => parseSettingsSectionPatch({ section: 'other', values: {} }), /valid settings section/);

  const saved = DEFAULT_ADMIN_SETTINGS;
  const draft = { ...saved, showDiscoverInNav: true, atomLimit: 75, allowlistedWallets: [WALLET] };
  assert.equal(isSettingsSectionDirty(draft, saved, 'visibility'), true);
  assert.equal(isSettingsSectionDirty(draft, saved, 'limits'), true);
  assert.equal(isSettingsSectionDirty(draft, saved, 'allowlist'), true);
  const server = { ...saved, showDiscoverInNav: true };
  const merged = mergeSavedSettings(draft, saved, server, 'visibility');
  assert.equal(isSettingsSectionDirty(merged, server, 'visibility'), false);
  assert.equal(merged.atomLimit, 75);
  assert.deepEqual(merged.allowlistedWallets, [WALLET]);
  assert.deepEqual(pickSettingsSection(merged, 'visibility'), { showActivityInNav: false, showDiscoverInNav: true });
});

test('authenticated section saves only write that section and keep the old PUT contract intact', async () => {
  const previousSecret = process.env.ADMIN_AUTH_SECRET;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const globalWithPool = globalThis as typeof globalThis & { collateDatabasePool?: unknown };
  const previousPool = globalWithPool.collateDatabasePool;
  process.env.ADMIN_AUTH_SECRET = 'test-secret-for-admin-settings-longer-than-thirty-two';
  process.env.DATABASE_URL = 'postgres://test:test@localhost/test';

  const stored = new Map<string, unknown>();
  const writes: string[][] = [];
  globalWithPool.collateDatabasePool = {
    query: async (sql: string, params: unknown[]) => {
      if (sql.startsWith('SELECT key')) {
        return { rows: [...stored].map(([key, value]) => ({ key, value })) };
      }
      if (sql.startsWith('INSERT INTO collate_app_settings')) {
        const [keys, values] = params as [string[], string[]];
        writes.push(keys);
        keys.forEach((key, index) => stored.set(key, JSON.parse(values[index]!)));
        return { rows: [] };
      }
      throw new Error(`Unexpected settings query: ${sql}`);
    },
  };

  try {
    assert.equal((await PATCH(sectionRequest({ section: 'visibility', values: { showActivityInNav: true, showDiscoverInNav: true } }))).status, 401);
    const cookie = `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken()}`;
    assert.equal((await PATCH(sectionRequest({ section: 'visibility', values: { showActivityInNav: true, showDiscoverInNav: true } }, cookie, 'cross-site'))).status, 403);
    assert.equal((await PATCH(sectionRequest({ section: 'limits', values: { atomLimit: 101, listLimit: 50, privilegedLimit: 150 } }, cookie))).status, 400);
    assert.equal((await PATCH(sectionRequest({ section: 'limits', values: { atomLimit: 75, listLimit: 50, privilegedLimit: 60 } }, cookie))).status, 400);
    assert.equal(writes.length, 0);

    const visibility = await PATCH(sectionRequest({ section: 'visibility', values: { showActivityInNav: true, showDiscoverInNav: true } }, cookie));
    assert.equal(visibility.status, 200);
    assert.deepEqual(writes[0], ['show_activity_in_nav', 'show_discover_in_nav']);

    const limits = await PATCH(sectionRequest({ section: 'limits', values: { atomLimit: 75, listLimit: 60, privilegedLimit: 150 } }, cookie));
    assert.equal(limits.status, 200);
    assert.deepEqual(writes[1], ['normal_atom_limit', 'normal_list_limit', 'privileged_batch_limit']);

    const allowlist = await PATCH(sectionRequest({ section: 'allowlist', values: { allowlistedWallets: [WALLET, WALLET] } }, cookie));
    assert.equal(allowlist.status, 200);
    assert.deepEqual(writes[2], ['batch_allowlisted_wallets']);
    const settings = (await (await GET(new NextRequest('http://localhost/api/admin/settings', { headers: { cookie } }))).json()).settings;
    assert.deepEqual(settings, {
      ...DEFAULT_ADMIN_SETTINGS,
      showActivityInNav: true,
      showDiscoverInNav: true,
      atomLimit: 75,
      listLimit: 60,
      allowlistedWallets: [WALLET],
    });
  } finally {
    globalWithPool.collateDatabasePool = previousPool;
    if (previousSecret === undefined) delete process.env.ADMIN_AUTH_SECRET;
    else process.env.ADMIN_AUTH_SECRET = previousSecret;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
