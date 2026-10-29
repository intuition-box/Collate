import { NextRequest, NextResponse } from 'next/server';

import { getRelicOwnership } from '@/lib/relic/ownership';
import { parseRelicAddresses } from '@/lib/relic/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid address list is required.' }, { status: 400 });
  }

  const input = body && typeof body === 'object' && 'addresses' in body ? body.addresses : null;
  let addresses;
  try {
    addresses = parseRelicAddresses(input);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'A valid address list is required.' }, { status: 400 });
  }

  return NextResponse.json(
    { holders: await getRelicOwnership(addresses) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
