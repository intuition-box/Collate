import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getEffectiveCreationLimits } from '@/lib/settings/database';
import { DEFAULT_ADMIN_SETTINGS, resolveCreationLimits } from '@/lib/settings/creation-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (address && !isAddress(address)) return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
  if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({ limits: resolveCreationLimits(DEFAULT_ADMIN_SETTINGS) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return NextResponse.json({ limits: await getEffectiveCreationLimits(address) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[creation-limits] Unable to read limits.', error);
    return NextResponse.json({ error: 'Batch limits are temporarily unavailable.' }, { status: 503 });
  }
}
