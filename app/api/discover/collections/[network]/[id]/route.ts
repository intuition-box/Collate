import { NextRequest, NextResponse } from 'next/server';

import { getDiscoverCollectionDetail } from '@/lib/discover/data';
import { isGraphTermId } from '@/lib/intuition/graph-detail-route';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_CURSOR = 9_223_372_036_854_775_807n;

export async function GET(request: NextRequest, { params }: { params: { network: string; id: string } }) {
  if ((params.network !== 'mainnet' && params.network !== 'testnet') || !isGraphTermId(params.id)) {
    return NextResponse.json({ error: 'Collection address is invalid.' }, { status: 400 });
  }

  const rawCursor = request.nextUrl.searchParams.get('cursor');
  if (rawCursor && (rawCursor.length > 19 || !/^[1-9]\d*$/.test(rawCursor) || BigInt(rawCursor) > MAX_CURSOR)) {
    return NextResponse.json({ error: 'Cursor is invalid.' }, { status: 400 });
  }
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 24);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 24;

  try {
    const detail = await getDiscoverCollectionDetail(params.network as PublicIntuitionNetwork, params.id.toLowerCase(), rawCursor, limit);
    if (!detail) return NextResponse.json({ error: 'Collection not found on this network.' }, { status: 404 });
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('[discover-collection] Unable to load collection.', error);
    return NextResponse.json({ error: 'Collection details are temporarily unavailable.' }, { status: 503 });
  }
}
