import type { ActivityItemRecord } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

interface ActivityItemsQueryFilters {
  network: PublicIntuitionNetwork | null;
  kind: ActivityItemRecord['kind'] | null;
  wallet: string | null;
  cursor: string | null;
  limit: number;
}

export function buildActivityItemsQuery({ network, kind, wallet, cursor, limit }: ActivityItemsQueryFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const addFilter = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', `$${values.length}`));
  };

  if (network) addFilter('activity.network = ?', network);
  if (kind) addFilter('activity.item_kind = ?', kind);
  if (wallet) addFilter('LOWER(activity.creator_wallet) = LOWER(?)', wallet);
  if (cursor) addFilter('activity.id < ?', cursor);
  values.push(limit + 1);

  return {
    text: `SELECT activity.id::text AS id, activity.item_kind, activity.network, activity.tx_hash,
      activity.creator_wallet, activity.protocol_id, activity.subject_id, activity.predicate_id,
      activity.object_id, activity.block_number::text AS block_number, activity.created_at
    FROM collate_activity_items AS activity
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
    ORDER BY activity.id DESC
    LIMIT $${values.length}`,
    values,
  };
}
