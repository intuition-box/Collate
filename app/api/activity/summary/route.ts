import { NextRequest, NextResponse } from 'next/server';

import { getActivityDatabasePool } from '@/lib/activity/database';
import type { PublicIntuitionNetwork } from '@/types/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseNetwork(value: string | null): PublicIntuitionNetwork | null | undefined {
  if (!value || value === 'all') return null;
  if (value === 'mainnet' || value === 'testnet') return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const network = parseNetwork(request.nextUrl.searchParams.get('network'));

  if (network === undefined) {
    return NextResponse.json({ error: 'Unsupported network filter.' }, { status: 400 });
  }

  try {
    const pool = getActivityDatabasePool();
    const networkClause = network ? 'WHERE network = $1' : '';
    const values = network ? [network] : [];
    const [totals, transactions, leaderboard] = await Promise.all([
      pool.query<{ item_kind: string; count: string }>(
        `SELECT item_kind, COUNT(*)::text AS count
        FROM collate_activity_items ${networkClause}
        GROUP BY item_kind`,
        values,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM collate_activity_transactions
        WHERE status = 'confirmed'${network ? ' AND network = $1' : ''}`,
        values,
      ),
      pool.query<{
        creator_wallet: string;
        atoms: string;
        list_entries: string;
        claims: string;
        standalone_claims: string;
        total: string;
      }>(
        `SELECT creator_wallet,
          COUNT(*) FILTER (WHERE item_kind = 'atom')::text AS atoms,
          COUNT(*) FILTER (WHERE item_kind = 'list_entry')::text AS list_entries,
          COUNT(*) FILTER (WHERE item_kind IN ('list_entry', 'claim'))::text AS claims,
          COUNT(*) FILTER (WHERE item_kind = 'claim')::text AS standalone_claims,
          COUNT(*)::text AS total
        FROM collate_activity_items ${networkClause}
        GROUP BY creator_wallet
        ORDER BY COUNT(*) DESC, creator_wallet ASC
        LIMIT 50`,
        values,
      ),
    ]);

    const counts = { atoms: 0, listEntries: 0, claims: 0, standaloneClaims: 0 };
    totals.rows.forEach((row) => {
      if (row.item_kind === 'atom') counts.atoms = Number(row.count);
      if (row.item_kind === 'list_entry') {
        counts.listEntries = Number(row.count);
        counts.claims += Number(row.count);
      }
      if (row.item_kind === 'claim') {
        counts.standaloneClaims = Number(row.count);
        counts.claims += Number(row.count);
      }
    });

    return NextResponse.json(
      {
        network: network ?? 'all',
        totals: { ...counts, confirmedTransactions: Number(transactions.rows[0]?.count ?? 0) },
        leaderboard: leaderboard.rows.map((row) => ({
          wallet: row.creator_wallet,
          atoms: Number(row.atoms),
          listEntries: Number(row.list_entries),
          claims: Number(row.claims),
          standaloneClaims: Number(row.standalone_claims),
          total: Number(row.total),
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('[activity-summary] Unable to read activity summary.', error);
    return NextResponse.json({ error: 'Activity summary is temporarily unavailable.' }, { status: 503 });
  }
}
