import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import test from 'node:test';

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from '../../lib/admin/auth';

const originalPasswordHash = process.env.ADMIN_PASSWORD_HASH;
const originalAuthSecret = process.env.ADMIN_AUTH_SECRET;

test.after(() => {
  if (originalPasswordHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
  else process.env.ADMIN_PASSWORD_HASH = originalPasswordHash;

  if (originalAuthSecret === undefined) delete process.env.ADMIN_AUTH_SECRET;
  else process.env.ADMIN_AUTH_SECRET = originalAuthSecret;
});

function createPasswordHash(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}`;
}

test('admin password verification accepts only the configured scrypt hash', async () => {
  process.env.ADMIN_PASSWORD_HASH = createPasswordHash('correct horse battery staple');

  assert.equal(await verifyAdminPassword('correct horse battery staple'), true);
  assert.equal(await verifyAdminPassword('incorrect password'), false);
});

test('admin session tokens reject tampering and expiration', () => {
  process.env.ADMIN_AUTH_SECRET = 'a-secure-test-secret-that-is-longer-than-thirty-two-characters';
  const issuedAt = 1_000_000;
  const token = createAdminSessionToken(issuedAt);
  const [payload, signature] = token.split('.');

  assert.equal(verifyAdminSessionToken(token, issuedAt + 1_000), true);
  assert.equal(verifyAdminSessionToken(`${payload}.${signature}x`, issuedAt + 1_000), false);
  assert.equal(
    verifyAdminSessionToken(token, issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 1),
    false,
  );
});

test('admin authentication rejects malformed configuration', async () => {
  process.env.ADMIN_PASSWORD_HASH = 'not-a-scrypt-hash';
  await assert.rejects(() => verifyAdminPassword('anything'), /invalid format/);

  process.env.ADMIN_AUTH_SECRET = 'too-short';
  assert.throws(() => createAdminSessionToken(), /at least 32 characters/);
});
