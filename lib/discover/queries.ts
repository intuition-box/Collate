import { getRecognizedHasTagPredicateTermIds } from '@/lib/intuition/list-predicate';
import type { PublicIntuitionNetwork } from '@/types/api';

export function buildCollectionSummariesQuery(network: PublicIntuitionNetwork, listId?: string) {
  const values: unknown[] = [network, [...getRecognizedHasTagPredicateTermIds(network)].map((id) => id.toLowerCase())];
  const listFilter = listId ? `AND LOWER(item.object_id) = $${values.push(listId.toLowerCase())}` : '';
  return {
    text: `SELECT LOWER(item.object_id) AS id,
      COUNT(DISTINCT LOWER(item.subject_id))::text AS member_count,
      COUNT(DISTINCT LOWER(item.creator_wallet))::text AS contributor_count,
      MAX(publish.block_timestamp) AS updated_at
    FROM collate_activity_items AS item
    JOIN collate_activity_transactions AS publish ON publish.id = item.transaction_id
    WHERE item.network = $1 AND publish.network = $1 AND publish.status = 'confirmed'
      AND item.item_kind = 'list_entry' AND item.subject_id IS NOT NULL AND item.object_id IS NOT NULL
      AND LOWER(item.predicate_id) = ANY($2::text[]) ${listFilter}
    GROUP BY LOWER(item.object_id)
    ORDER BY updated_at DESC, id ASC`,
    values,
  };
}

export function buildCollectionMembersQuery(network: PublicIntuitionNetwork, listId: string, cursor: string | null, limit: number) {
  const values: unknown[] = [network, [...getRecognizedHasTagPredicateTermIds(network)].map((id) => id.toLowerCase()), listId.toLowerCase()];
  const cursorFilter = cursor
    ? `AND (ranked.added_at, ranked.id) < (SELECT added_at, id FROM ranked WHERE row_rank = 1 AND id = $${values.push(cursor)}::bigint)`
    : '';
  values.push(limit + 1);
  return {
    text: `WITH ranked AS (
      SELECT item.id, item.subject_id, item.creator_wallet, publish.block_timestamp AS added_at,
        ROW_NUMBER() OVER (PARTITION BY LOWER(item.subject_id) ORDER BY publish.block_timestamp DESC, item.id DESC) AS row_rank
      FROM collate_activity_items AS item
      JOIN collate_activity_transactions AS publish ON publish.id = item.transaction_id
      WHERE item.network = $1 AND publish.network = $1 AND publish.status = 'confirmed'
        AND item.item_kind = 'list_entry' AND item.subject_id IS NOT NULL
        AND LOWER(item.object_id) = $3 AND LOWER(item.predicate_id) = ANY($2::text[])
    )
    SELECT ranked.id::text AS id, ranked.subject_id, ranked.creator_wallet, ranked.added_at
    FROM ranked WHERE ranked.row_rank = 1 ${cursorFilter}
    ORDER BY ranked.added_at DESC, ranked.id DESC
    LIMIT $${values.length}`,
    values,
  };
}

export function buildRecentBatchesQuery(network: PublicIntuitionNetwork, limit: number) {
  return {
    text: `WITH counted AS (
      SELECT publish.id::text AS id, publish.network, publish.tx_hash, publish.expected_wallet,
        publish.block_timestamp AS created_at,
        COUNT(*) FILTER (WHERE item.item_kind = 'atom')::integer AS atom_count,
        COUNT(*) FILTER (WHERE item.item_kind = 'list_entry'
          AND LOWER(item.predicate_id) = ANY($2::text[]))::integer AS list_entry_count
      FROM collate_activity_transactions AS publish
      JOIN collate_activity_items AS item ON item.transaction_id = publish.id AND item.network = publish.network
      WHERE publish.network = $1 AND publish.status = 'confirmed'
        AND publish.tx_hash IS NOT NULL AND publish.block_timestamp IS NOT NULL
      GROUP BY publish.id
    )
    SELECT * FROM counted WHERE atom_count + list_entry_count >= 2
    ORDER BY created_at DESC, id DESC LIMIT $3`,
    values: [network, [...getRecognizedHasTagPredicateTermIds(network)].map((id) => id.toLowerCase()), limit],
  };
}
