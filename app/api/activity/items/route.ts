import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getActivityDatabasePool } from '@/lib/activity/database';
import { enrichActivityItems } from '@/lib/activity/enrich-items';
import { mapActivityItemRow, type ActivityItemDatabaseRow } from '@/lib/activity/item-row';
import { buildActivityItemsQuery } from '@/lib/activity/items-query';
import { readRemoteActivityItems, shouldReadRemoteActivity } from '@/lib/activity/remote-read';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const network = params.get('network');
  const kind = params.get('kind');
  const wallet = params.get('wallet');
  const cursor = params.get('cursor');
  const requestedLimit = Number(params.get('limit') ?? 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

  if (network && network !== 'mainnet' && network !== 'testnet') {
    return NextResponse.json({ error: 'Unsupported network filter.' }, { status: 400 });
  }

  if (kind && kind !== 'atom' && kind !== 'list_entry' && kind !== 'claim') {
    return NextResponse.json({ error: 'Unsupported activity kind.' }, { status: 400 });
  }

  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: 'Wallet filter is invalid.' }, { status: 400 });
  }

  if (cursor && (!/^\d+$/.test(cursor) || cursor === '0')) {
    return NextResponse.json({ error: 'Cursor is invalid.' }, { status: 400 });
  }

  if (shouldReadRemoteActivity()) {
    try {
      return NextResponse.json(await readRemoteActivityItems({
        network: network === 'mainnet' || network === 'testnet' ? network : null,
        kind: kind === 'atom' || kind === 'list_entry' || kind === 'claim' ? kind : null,
        wallet,
        cursor,
        limit,
      }), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[activity-items] Unable to read live activity in development.', error);
      return NextResponse.json({ error: 'Live activity is temporarily unavailable.' }, { status: 503 });
    }
  }

  const query = buildActivityItemsQuery({
    network: network === 'mainnet' || network === 'testnet' ? network : null,
    kind: kind === 'atom' || kind === 'list_entry' || kind === 'claim' ? kind : null,
    wallet,
    cursor,
    limit,
  });

  try {
    const result = await getActivityDatabasePool().query<ActivityItemDatabaseRow>(query.text, query.values);
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit);

    const items = rows.map(mapActivityItemRow);

    return NextResponse.json(
      {
        items: await enrichActivityItems(items),
        nextCursor: hasMore ? rows.at(-1)?.id ?? null : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    console.error('[activity-items] Unable to read activity items.', error);
    return NextResponse.json({ error: 'Activity items are temporarily unavailable.' }, { status: 503 });
  }
}
