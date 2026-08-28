import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { getActivityDatabasePool } from '@/lib/activity/database';

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

  const clauses: string[] = [];
  const values: unknown[] = [];
  const addFilter = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (network) addFilter('network = ?', network);
  if (kind) addFilter('item_kind = ?', kind);
  if (wallet) addFilter('LOWER(creator_wallet) = LOWER(?)', wallet);
  if (cursor) addFilter('id < ?', cursor);
  values.push(limit + 1);

  try {
    const result = await getActivityDatabasePool().query<{
      id: string;
      item_kind: string;
      network: string;
      tx_hash: string;
      creator_wallet: string;
      protocol_id: string;
      subject_id: string | null;
      predicate_id: string | null;
      object_id: string | null;
      block_number: string;
      created_at: Date | string;
    }>(
      `SELECT id::text, item_kind, network, tx_hash, creator_wallet, protocol_id,
        subject_id, predicate_id, object_id, block_number::text, created_at
      FROM collate_activity_items
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY id DESC
      LIMIT $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > limit;
    const rows = result.rows.slice(0, limit);

    return NextResponse.json(
      {
        items: rows.map((row) => ({
          id: row.id,
          kind: row.item_kind,
          network: row.network,
          txHash: row.tx_hash,
          creatorWallet: row.creator_wallet,
          protocolId: row.protocol_id,
          subjectId: row.subject_id,
          predicateId: row.predicate_id,
          objectId: row.object_id,
          blockNumber: row.block_number,
          createdAt: new Date(row.created_at).toISOString(),
        })),
        nextCursor: hasMore ? rows.at(-1)?.id ?? null : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } },
    );
  } catch (error) {
    console.error('[activity-items] Unable to read activity items.', error);
    return NextResponse.json({ error: 'Activity items are temporarily unavailable.' }, { status: 503 });
  }
}
