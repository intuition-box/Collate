import type { ActivityPublish, ConfirmedActivityItem } from '@/types/activity';

export interface PublishDatabaseRow {
  id: string;
  network: ActivityPublish['network'];
  tx_hash: ActivityPublish['txHash'];
  expected_wallet: ActivityPublish['creatorWallet'];
  item_kind: ActivityPublish['kind'];
  source_flow: ActivityPublish['sourceFlow'];
  expected_item_count: number;
  block_timestamp: Date | string;
}

export function assembleActivityPublishes(
  rows: PublishDatabaseRow[],
  previews: Array<{ transactionId: string; item: ConfirmedActivityItem }>,
): ActivityPublish[] {
  const previewsByPublish = new Map<string, ConfirmedActivityItem[]>();
  for (const preview of previews) {
    const items = previewsByPublish.get(preview.transactionId) ?? [];
    items.push(preview.item);
    previewsByPublish.set(preview.transactionId, items);
  }

  return rows.map((row) => ({
    id: row.id,
    network: row.network,
    txHash: row.tx_hash,
    creatorWallet: row.expected_wallet,
    kind: row.item_kind,
    sourceFlow: row.source_flow,
    itemCount: row.expected_item_count,
    createdAt: new Date(row.block_timestamp).toISOString(),
    previewItems: previewsByPublish.get(row.id) ?? [],
  }));
}
