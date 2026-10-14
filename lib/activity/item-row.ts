import type { ActivityItemRecord } from '@/types/activity';

export interface ActivityItemDatabaseRow {
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
}

export function mapActivityItemRow(row: ActivityItemDatabaseRow): ActivityItemRecord {
  return {
    id: row.id,
    kind: row.item_kind as ActivityItemRecord['kind'],
    network: row.network as ActivityItemRecord['network'],
    txHash: row.tx_hash as ActivityItemRecord['txHash'],
    creatorWallet: row.creator_wallet as ActivityItemRecord['creatorWallet'],
    protocolId: row.protocol_id as ActivityItemRecord['protocolId'],
    subjectId: row.subject_id as ActivityItemRecord['subjectId'],
    predicateId: row.predicate_id as ActivityItemRecord['predicateId'],
    objectId: row.object_id as ActivityItemRecord['objectId'],
    blockNumber: row.block_number,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
