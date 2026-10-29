import type { PublicIntuitionNetwork } from '@/types/api';

interface PublishFilters {
  network: PublicIntuitionNetwork | null;
  cursor: string | null;
  limit: number;
  wallet?: string | null;
}

export function buildActivityPublishesQuery({ network, cursor, limit, wallet }: PublishFilters) {
  const values: unknown[] = [];
  const filters = ["publish.status = 'confirmed'", 'publish.block_timestamp IS NOT NULL', 'publish.tx_hash IS NOT NULL'];
  let cursorJoin = '';

  if (network) {
    values.push(network);
    filters.push(`publish.network = $${values.length}`);
  }
  if (wallet) {
    values.push(wallet);
    filters.push(`LOWER(publish.expected_wallet) = LOWER($${values.length})`);
  }
  if (cursor) {
    values.push(cursor);
    cursorJoin = `JOIN collate_activity_transactions AS cursor_publish ON cursor_publish.id = $${values.length}::uuid`;
    filters.push('(publish.block_timestamp, publish.id) < (cursor_publish.block_timestamp, cursor_publish.id)');
  }
  values.push(limit + 1);

  return {
    text: `SELECT publish.id::text AS id, publish.network, publish.tx_hash, publish.expected_wallet,
      publish.item_kind, publish.source_flow, publish.expected_item_count, publish.block_timestamp
    FROM collate_activity_transactions AS publish
    ${cursorJoin}
    WHERE ${filters.join(' AND ')}
    ORDER BY publish.block_timestamp DESC, publish.id DESC
    LIMIT $${values.length}`,
    values,
  };
}

export function buildPublishPreviewItemsQuery(publishIds: string[], previewLimit = 3) {
  return {
    text: `SELECT activity.transaction_id::text AS transaction_id, activity.id::text AS id,
      activity.item_kind, activity.network, activity.tx_hash, activity.creator_wallet,
      activity.protocol_id, activity.subject_id, activity.predicate_id, activity.object_id,
      activity.block_number::text AS block_number, activity.created_at
    FROM unnest($1::uuid[]) WITH ORDINALITY AS chosen(id, position)
    JOIN LATERAL (
      SELECT * FROM collate_activity_items
      WHERE transaction_id = chosen.id
      ORDER BY item_index ASC
      LIMIT $2
    ) AS activity ON true
    ORDER BY chosen.position, activity.item_index ASC`,
    values: [publishIds, previewLimit],
  };
}

export function buildPublishItemsQuery(publishId: string, cursor: number | null, limit: number) {
  const values: unknown[] = [publishId];
  const cursorFilter = cursor === null ? '' : `AND activity.item_index > $${values.push(cursor)}::integer`;
  values.push(limit + 1);

  return {
    text: `SELECT activity.item_index, activity.id::text AS id, activity.item_kind,
      activity.network, activity.tx_hash, activity.creator_wallet, activity.protocol_id,
      activity.subject_id, activity.predicate_id, activity.object_id,
      activity.block_number::text AS block_number, activity.created_at
    FROM collate_activity_items AS activity
    JOIN collate_activity_transactions AS publish ON publish.id = activity.transaction_id
    WHERE activity.transaction_id = $1::uuid AND publish.status = 'confirmed' ${cursorFilter}
    ORDER BY activity.item_index ASC
    LIMIT $${values.length}`,
    values,
  };
}
