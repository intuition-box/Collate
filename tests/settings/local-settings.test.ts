import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { POST as login } from '@/app/api/admin/login/route';
import { GET as getAdminSettings, PATCH as patchAdminSettings } from '@/app/api/admin/settings/route';
import { GET as getCreationLimits } from '@/app/api/settings/creation-limits/route';
import { GET as getPublicSettings } from '@/app/api/settings/public/route';
import { DEFAULT_ADMIN_SETTINGS } from '@/lib/settings/creation-limits';

const WALLET = '0x1111111111111111111111111111111111111111';

test('local admin login and settings work without a database', async () => {
  const previous = {
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    authSecret: process.env.ADMIN_AUTH_SECRET,
  };
  const directory = await mkdtemp(join(tmpdir(), 'collate-local-settings-'));
  const password = 'local-test-password';
  const salt = randomBytes(16);
  process.chdir(directory);
  Reflect.set(process.env, 'NODE_ENV', 'development');
  delete process.env.DATABASE_URL;
  process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt.toString('base64url')}:${scryptSync(password, salt, 64).toString('base64url')}`;
  process.env.ADMIN_AUTH_SECRET = 'local-settings-test-secret-longer-than-thirty-two';

  try {
    const signedIn = await login(new NextRequest('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }));
    assert.equal(signedIn.status, 200);
    const cookie = signedIn.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);

    const adminRequest = new NextRequest('http://localhost/api/admin/settings', { headers: { cookie } });
    assert.deepEqual((await (await getAdminSettings(adminRequest)).json()).settings, DEFAULT_ADMIN_SETTINGS);

    const patch = async (section: string, values: object) => patchAdminSettings(new NextRequest('http://localhost/api/admin/settings', {
      method: 'PATCH',
      headers: { cookie, 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ section, values }),
    }));
    assert.equal((await patch('visibility', { showActivityInNav: true, showDiscoverInNav: true })).status, 200);
    assert.equal((await patch('limits', { atomLimit: 75, listLimit: 60, privilegedLimit: 150 })).status, 200);
    assert.equal((await patch('allowlist', { allowlistedWallets: [WALLET] })).status, 200);

    const settings = (await (await getAdminSettings(adminRequest)).json()).settings;
    assert.deepEqual(settings, {
      ...DEFAULT_ADMIN_SETTINGS,
      showActivityInNav: true,
      showDiscoverInNav: true,
      atomLimit: 75,
      listLimit: 60,
      allowlistedWallets: [WALLET],
    });
    assert.deepEqual((await (await getPublicSettings()).json()).settings, {
      showActivityInNav: true,
      showDiscoverInNav: true,
    });
    assert.deepEqual((await (await getCreationLimits(new NextRequest(`http://localhost/api/settings/creation-limits?address=${WALLET}`))).json()).limits, {
      atomLimit: 150,
      listLimit: 150,
    });
    assert.deepEqual(JSON.parse(await readFile(join(directory, '.collate-local-settings.json'), 'utf8')), settings);
  } finally {
    process.chdir(previous.cwd);
    for (const [key, value] of [
      ['NODE_ENV', previous.nodeEnv],
      ['DATABASE_URL', previous.databaseUrl],
      ['ADMIN_PASSWORD_HASH', previous.passwordHash],
      ['ADMIN_AUTH_SECRET', previous.authSecret],
    ] as const) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else Reflect.set(process.env, key, value);
    }
    await rm(directory, { recursive: true, force: true });
  }
});
