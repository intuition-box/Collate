import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { normalize } from 'viem/ens';

import { ethereumClient } from '@/lib/ethereum/client';

export async function GET(request: NextRequest) {
  const addressInput = request.nextUrl.searchParams.get('address')?.trim() ?? '';

  if (!isAddress(addressInput)) {
    return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400 });
  }

  try {
    const address = getAddress(addressInput);
    const name = await ethereumClient.getEnsName({ address });
    let avatar: string | null = null;

    if (name) {
      try {
        avatar = await ethereumClient.getEnsAvatar({ name: normalize(name) });
      } catch {
        // A missing or malformed avatar should never hide a valid primary name.
      }
    }

    return NextResponse.json(
      { profile: name ? { name, avatar } : null },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    console.error('[ens-profile] ENS resolution failed.', error);
    return NextResponse.json({ error: 'ENS resolution is temporarily unavailable.' }, { status: 502 });
  }
}
