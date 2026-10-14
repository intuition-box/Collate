import { NextRequest, NextResponse } from 'next/server';

import { getActivityDatabasePool } from '@/lib/activity/database';
import { enrichActivityItems } from '@/lib/activity/enrich-items';
import { mapActivityItemRow, type ActivityItemDatabaseRow } from '@/lib/activity/item-row';
import { buildPublishItemsQuery } from '@/lib/activity/publishes-query';
import { readRemotePublishItems, shouldReadRemoteActivity } from '@/lib/activity/remote-read';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PublishItemDatabaseRow extends ActivityItemDatabaseRow {
  item_index: number;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'Publish ID is invalid.' }, { status: 400 });
  }

  const requestedCursor = request.nextUrl.searchParams.get('cursor');
  const cursor = requestedCursor === null ? null : Number(requestedCursor);
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 25);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;

  if (requestedCursor !== null && (!/^(0|[1-9]\d*)$/.test(requestedCursor) || !Number.isSafeInteger(cursor) || cursor! > 2_147_483_647)) {
    return NextResponse.json({ error: 'Cursor is invalid.' }, { status: 400 });
  }

  if (shouldReadRemoteActivity()) {
    try {
      return NextResponse.json(await readRemotePublishItems(params.id, requestedCursor, limit), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      console.error('[activity-publish-items] Unable to read live activity in development.', error);
      return NextResponse.json({ error: 'Live activity is temporarily unavailable.' }, { status: 503 });
    }
  }

  try {
    const query = buildPublishItemsQuery(params.id, cursor, limit);
    const result = await getActivityDatabasePool().query<PublishItemDatabaseRow>(query.text, query.values);
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit);

    return NextResponse.json(
      {
        items: await enrichActivityItems(rows.map(mapActivityItemRow)),
        nextCursor: hasMore ? String(rows.at(-1)?.item_index) : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    console.error('[activity-publish-items] Unable to read publish items.', error);
    return NextResponse.json({ error: 'Publish details are temporarily unavailable.' }, { status: 503 });
  }
}
