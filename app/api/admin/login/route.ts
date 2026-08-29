import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminPassword,
} from '@/lib/admin/auth';

export const runtime = 'nodejs';

interface LoginAttempt {
  failures: number;
  resetAt: number;
}

const globalForLoginAttempts = globalThis as typeof globalThis & {
  collateLoginAttempts?: Map<string, LoginAttempt>;
};
const loginAttempts = globalForLoginAttempts.collateLoginAttempts ?? new Map<string, LoginAttempt>();
globalForLoginAttempts.collateLoginAttempts = loginAttempts;

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function getClientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const currentAttempt = loginAttempts.get(clientKey);

  if (currentAttempt && currentAttempt.resetAt > now && currentAttempt.failures >= MAX_FAILURES) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }
  if (currentAttempt && currentAttempt.resetAt <= now) loginAttempts.delete(clientKey);

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: 'A valid password is required.' }, { status: 400 });
  }

  if (typeof body.password !== 'string' || !body.password || body.password.length > 256) {
    return NextResponse.json({ error: 'A valid password is required.' }, { status: 400 });
  }

  try {
    const isValid = await verifyAdminPassword(body.password);
    if (!isValid) {
      const attempt = loginAttempts.get(clientKey);
      loginAttempts.set(clientKey, {
        failures: (attempt?.resetAt ?? 0) > now ? attempt!.failures + 1 : 1,
        resetAt: (attempt?.resetAt ?? 0) > now ? attempt!.resetAt : now + ATTEMPT_WINDOW_MS,
      });
      return NextResponse.json({ error: 'That password is not correct.' }, { status: 401 });
    }

    loginAttempts.delete(clientKey);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('[admin-login] Admin authentication is not configured correctly.', error);
    return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 });
  }
}
