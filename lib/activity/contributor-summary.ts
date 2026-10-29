import type { PublicIntuitionNetwork } from '@/types/api';

export function buildContributorSummaryQueries(wallet: string, network: PublicIntuitionNetwork | null) {
  const values: string[] = [wallet];
  const networkFilter = network ? ` AND item.network = $${values.push(network)}` : '';
  const publishNetworkFilter = network ? ' AND publish.network = $2' : '';

  return {
    items: {
      text: `SELECT
        COUNT(*) FILTER (WHERE item.item_kind = 'atom')::text AS atoms,
        COUNT(*) FILTER (WHERE item.item_kind IN ('list_entry', 'claim'))::text AS claims,
        COUNT(*) FILTER (WHERE item.item_kind = 'list_entry')::text AS list_entries
      FROM collate_activity_items AS item
      JOIN collate_activity_transactions AS publish ON publish.id = item.transaction_id
      WHERE publish.status = 'confirmed' AND LOWER(item.creator_wallet) = LOWER($1)${networkFilter}`,
      values,
    },
    publishes: {
      text: `SELECT COUNT(*)::text AS count
      FROM collate_activity_transactions AS publish
      WHERE publish.status = 'confirmed' AND publish.tx_hash IS NOT NULL
        AND LOWER(publish.expected_wallet) = LOWER($1)${publishNetworkFilter}`,
      values,
    },
  };
}
