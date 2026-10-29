import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';

import { getActivityDatabasePool } from '@/lib/activity/database';
import { enrichActivityItems } from '@/lib/activity/enrich-items';
import { mapActivityItemRow, type ActivityItemDatabaseRow } from '@/lib/activity/item-row';
import { buildActivityPublishesQuery, buildPublishPreviewItemsQuery } from '@/lib/activity/publishes-query';
import { assembleActivityPublishes, type PublishDatabaseRow } from '@/lib/activity/publishes';
import { readRemoteActivityPublishes, shouldReadRemoteActivity } from '@/lib/activity/remote-read';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreviewDatabaseRow extends ActivityItemDatabaseRow {
  transaction_id: string;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const network = params.get('network');
  const cursor = params.get('cursor');
  const wallet = params.get('wallet');
  const requestedLimit = Number(params.get('limit') ?? 20);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;

  if (network && network !== 'mainnet' && network !== 'testnet') {
    return NextResponse.json({ error: 'Unsupported network filter.' }, { status: 400 });
  }
  if (cursor && !UUID_PATTERN.test(cursor)) {
    return NextResponse.json({ error: 'Cursor is invalid.' }, { status: 400 });
  }
  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: 'Wallet filter is invalid.' }, { status: 400 });
  }

  const selectedNetwork: PublicIntuitionNetwork | null = network === 'mainnet' || network === 'testnet' ? network : null;
  const selectedWallet = wallet ? getAddress(wallet) : null;
  const filters = { network: selectedNetwork, cursor, limit, wallet: selectedWallet };
  if (shouldReadRemoteActivity()) {
    try {
      const remote = await readRemoteActivityPublishes(filters);
      return NextResponse.json(remote, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[activity-publishes] Unable to read live activity in development.', error);
      return NextResponse.json({ error: 'Live activity is temporarily unavailable.' }, { status: 503 });
    }
  }

  try {
    const pool = getActivityDatabasePool();
    const query = buildActivityPublishesQuery(filters);
    const result = await pool.query<PublishDatabaseRow>(query.text, query.values);
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit);
    let previews: Array<{ transactionId: string; item: Awaited<ReturnType<typeof enrichActivityItems>>[number] }> = [];

    if (rows.length > 0) {
      const previewQuery = buildPublishPreviewItemsQuery(rows.map((row) => row.id));
      const previewResult = await pool.query<PreviewDatabaseRow>(previewQuery.text, previewQuery.values);
      const enriched = await enrichActivityItems(previewResult.rows.map(mapActivityItemRow));
      previews = previewResult.rows.flatMap((row, index) => enriched[index]
        ? [{ transactionId: row.transaction_id, item: enriched[index]! }]
        : []);
    }

    const publishes = assembleActivityPublishes(rows, previews);

    return NextResponse.json(
      { publishes, nextCursor: hasMore ? rows.at(-1)?.id ?? null : null, ...(selectedWallet ? { wallet: selectedWallet } : {}) },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    console.error('[activity-publishes] Unable to read publishes.', error);
    return NextResponse.json({ error: 'Activity is temporarily unavailable.' }, { status: 503 });
  }
}
