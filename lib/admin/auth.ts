import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export const ADMIN_SESSION_COOKIE = 'collate_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = 'scrypt';

function getAuthSecret(): string {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_AUTH_SECRET must contain at least 32 characters.');
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('base64url');
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const encodedHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!encodedHash) {
    throw new Error('ADMIN_PASSWORD_HASH is not configured.');
  }

  const [prefix, saltValue, hashValue] = encodedHash.split(':');
  if (prefix !== PASSWORD_HASH_PREFIX || !saltValue || !hashValue) {
    throw new Error('ADMIN_PASSWORD_HASH has an invalid format.');
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedHash = Buffer.from(hashValue, 'base64url');
  if (salt.length < 16 || expectedHash.length !== 64) {
    throw new Error('ADMIN_PASSWORD_HASH has an invalid format.');
  }

  const suppliedHash = (await scrypt(password, salt, expectedHash.length)) as Buffer;
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function createAdminSessionToken(now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ version: 1, expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      version?: unknown;
      expiresAt?: unknown;
    };
    return parsed.version === 1 && typeof parsed.expiresAt === 'number' && parsed.expiresAt > now;
  } catch {
    return false;
  }
}
