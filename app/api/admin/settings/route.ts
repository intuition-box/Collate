import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin/auth';
import { getPublicSettings, updatePublicSettings } from '@/lib/settings/database';
import type { AdminSettingsResponse } from '@/types/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthenticated(request: NextRequest): boolean {
  try {
    return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  } catch (error) {
    console.error('[admin-settings] Admin authentication is not configured correctly.', error);
    return false;
  }
}

function unauthorized() {
  return NextResponse.json({ error: 'Sign in to manage settings.' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  try {
    const response: AdminSettingsResponse = { authenticated: true, settings: await getPublicSettings() };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin-settings] Unable to read settings.', error);
    return NextResponse.json({ error: 'Settings could not be loaded.' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'This settings request was rejected.' }, { status: 403 });
  }

  let body: { showActivityInNav?: unknown };
  try {
    body = (await request.json()) as { showActivityInNav?: unknown };
  } catch {
    return NextResponse.json({ error: 'Valid settings are required.' }, { status: 400 });
  }

  if (typeof body.showActivityInNav !== 'boolean') {
    return NextResponse.json({ error: 'Activity visibility must be enabled or disabled.' }, { status: 400 });
  }

  try {
    const response: AdminSettingsResponse = {
      authenticated: true,
      settings: await updatePublicSettings({ showActivityInNav: body.showActivityInNav }),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin-settings] Unable to update settings.', error);
    return NextResponse.json({ error: 'Settings could not be saved.' }, { status: 503 });
  }
}
