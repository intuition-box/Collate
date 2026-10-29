import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';

import { buildContributorSummaryQueries } from '@/lib/activity/contributor-summary';
import { getActivityDatabasePool } from '@/lib/activity/database';
import { readRemoteContributorSummary, shouldReadRemoteActivity } from '@/lib/activity/remote-read';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  if (!isAddress(params.address)) {
    return NextResponse.json({ error: 'Wallet address is invalid.' }, { status: 400 });
  }
  const wallet = getAddress(params.address);
  const requestedNetwork = request.nextUrl.searchParams.get('network') ?? 'mainnet';
  if (requestedNetwork !== 'mainnet' && requestedNetwork !== 'testnet' && requestedNetwork !== 'all') {
    return NextResponse.json({ error: 'Unsupported network filter.' }, { status: 400 });
  }
  const network: PublicIntuitionNetwork | null = requestedNetwork === 'all' ? null : requestedNetwork;

  if (shouldReadRemoteActivity()) {
    try {
      return NextResponse.json(await readRemoteContributorSummary(wallet, network), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[contributor-summary] Unable to read live contributor activity in development.', error);
      return NextResponse.json({ error: 'Contributor activity is temporarily unavailable.' }, { status: 503 });
    }
  }

  try {
    const pool = getActivityDatabasePool();
    const queries = buildContributorSummaryQueries(wallet, network);
    const [items, publishes] = await Promise.all([
      pool.query<{ atoms: string; claims: string; list_entries: string }>(queries.items.text, queries.items.values),
      pool.query<{ count: string }>(queries.publishes.text, queries.publishes.values),
    ]);
    return NextResponse.json({
      wallet,
      network: network ?? 'all',
      atoms: Number(items.rows[0]?.atoms ?? 0),
      claims: Number(items.rows[0]?.claims ?? 0),
      listEntries: Number(items.rows[0]?.list_entries ?? 0),
      publishes: Number(publishes.rows[0]?.count ?? 0),
    }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('[contributor-summary] Unable to read contributor activity.', error);
    return NextResponse.json({ error: 'Contributor activity is temporarily unavailable.' }, { status: 503 });
  }
}
