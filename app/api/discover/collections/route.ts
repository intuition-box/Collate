import { NextRequest, NextResponse } from 'next/server';

import { getDiscoverCollections } from '@/lib/discover/data';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { DiscoverCollectionsResponse } from '@/types/discover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get('network');
  if (network !== 'mainnet' && network !== 'testnet') {
    return NextResponse.json({ error: 'Choose Mainnet or Testnet.' }, { status: 400 });
  }

  try {
    const selectedNetwork: PublicIntuitionNetwork = network;
    const response: DiscoverCollectionsResponse = {
      network: selectedNetwork,
      collections: await getDiscoverCollections(selectedNetwork),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('[discover-collections] Unable to load collections.', error);
    return NextResponse.json({ error: 'Collections are temporarily unavailable.' }, { status: 503 });
  }
}
