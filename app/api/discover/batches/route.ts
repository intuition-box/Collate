import { NextRequest, NextResponse } from 'next/server';

import { getDiscoverRecentBatches } from '@/lib/discover/data';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { DiscoverBatchesResponse } from '@/types/discover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get('network');
  if (network !== 'mainnet' && network !== 'testnet') {
    return NextResponse.json({ error: 'Choose Mainnet or Testnet.' }, { status: 400 });
  }

  try {
    const selectedNetwork: PublicIntuitionNetwork = network;
    const response: DiscoverBatchesResponse = {
      network: selectedNetwork,
      batches: await getDiscoverRecentBatches(selectedNetwork),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('[discover-batches] Unable to load recent batches.', error);
    return NextResponse.json({ error: 'Recent batches are temporarily unavailable.' }, { status: 503 });
  }
}
