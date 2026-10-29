import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin/auth';
import { getAdminSettings, updateAdminSettings, updateAdminSettingsSection } from '@/lib/settings/database';
import { validateAdminSettings } from '@/lib/settings/creation-limits';
import { parseSettingsSectionPatch } from '@/lib/settings/sections';
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
    const response: AdminSettingsResponse = { authenticated: true, settings: await getAdminSettings() };
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Valid settings are required.' }, { status: 400 });
  }

  let settings;
  try {
    settings = validateAdminSettings(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid settings.' }, { status: 400 });
  }

  try {
    const response: AdminSettingsResponse = {
      authenticated: true,
      settings: await updateAdminSettings(settings),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin-settings] Unable to update settings.', error);
    return NextResponse.json({ error: 'Settings could not be saved.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'This settings request was rejected.' }, { status: 403 });
  }

  let patch;
  try {
    patch = parseSettingsSectionPatch(await request.json());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Valid settings are required.' }, { status: 400 });
  }

  try {
    const current = await getAdminSettings();
    let validated;
    try {
      validated = validateAdminSettings({ ...current, ...patch.values });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid settings.' }, { status: 400 });
    }
    const response: AdminSettingsResponse = {
      authenticated: true,
      settings: await updateAdminSettingsSection(patch.section, validated),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin-settings] Unable to update section.', error);
    return NextResponse.json({ error: 'Settings could not be saved.' }, { status: 503 });
  }
}
