import { NextResponse } from 'next/server';

import { DEFAULT_PUBLIC_SETTINGS, getPublicSettings } from '@/lib/settings/database';
import type { PublicSettingsResponse } from '@/types/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response: PublicSettingsResponse = { settings: await getPublicSettings() };
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    });
  } catch (error) {
    console.error('[public-settings] Unable to read app settings.', error);
    const response: PublicSettingsResponse = { settings: DEFAULT_PUBLIC_SETTINGS };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  }
}
