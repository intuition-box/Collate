import { Pool } from 'pg';
import type { Address, Hex } from 'viem';

import type { VerifiedActivityItem } from '@/lib/activity/events';
import type {
  ActivityItemKind,
  ActivityOperation,
  ActivitySourceFlow,
  ActivityTransactionStatus,
} from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

interface QueryResult<Row> {
  rows: Row[];
  rowCount: number | null;
}

interface ActivityQueryClient {
  query<Row = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
  release?: () => void;
}

interface ActivityPool extends ActivityQueryClient {
  connect(): Promise<ActivityQueryClient>;
}

const globalForActivityDatabase = globalThis as typeof globalThis & {
  collateActivityPool?: Pool;
};

export interface ActivityTransactionRecord {
  id: string;
  network: PublicIntuitionNetwork;
  chain_id: number;
  source_flow: ActivitySourceFlow;
  item_kind: ActivityItemKind;
  operation: ActivityOperation;
  expected_item_count: number;
  expected_wallet: string;
  calldata_hash: string;
  tx_hash: string | null;
  status: ActivityTransactionStatus;
  expires_at: Date | string;
}

export interface CreateActivityIntentRecord {
  id: string;
  network: PublicIntuitionNetwork;
  chainId: number;
  sourceFlow: ActivitySourceFlow;
  itemKind: ActivityItemKind;
  operation: ActivityOperation;
  expectedItemCount: number;
  expectedWallet: Address;
  calldataHash: Hex;
  expiresAt: Date;
}

export interface ConfirmActivityRecord {
  id: string;
  network: PublicIntuitionNetwork;
  chainId: number;
  txHash: Hex;
  creatorWallet: Address;
  blockNumber: bigint;
  blockTimestamp: Date;
  items: VerifiedActivityItem[];
}

function getPool(): ActivityPool {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!globalForActivityDatabase.collateActivityPool) {
    const pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (error) => {
      console.error('[activity-database] Unexpected idle PostgreSQL client error.', error);
    });

    globalForActivityDatabase.collateActivityPool = pool;
  }

  return globalForActivityDatabase.collateActivityPool as unknown as ActivityPool;
}

export async function createActivityIntent(record: CreateActivityIntentRecord): Promise<void> {
  await getPool().query(
    `INSERT INTO collate_activity_transactions (
      id, network, chain_id, source_flow, item_kind, operation, expected_item_count,
      expected_wallet, calldata_hash, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      record.id,
      record.network,
      record.chainId,
      record.sourceFlow,
      record.itemKind,
      record.operation,
      record.expectedItemCount,
      record.expectedWallet,
      record.calldataHash,
      record.expiresAt,
    ],
  );
}

export async function getActivityTransaction(id: string): Promise<ActivityTransactionRecord | null> {
  const result = await getPool().query<ActivityTransactionRecord>(
    `SELECT id, network, chain_id, source_flow, item_kind, operation, expected_item_count,
      expected_wallet, calldata_hash, tx_hash, status, expires_at
    FROM collate_activity_transactions
    WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findActivityTransactionByHash(chainId: number, txHash: Hex): Promise<ActivityTransactionRecord | null> {
  const result = await getPool().query<ActivityTransactionRecord>(
    `SELECT id, network, chain_id, source_flow, item_kind, operation, expected_item_count,
      expected_wallet, calldata_hash, tx_hash, status, expires_at
    FROM collate_activity_transactions
    WHERE chain_id = $1 AND LOWER(tx_hash) = LOWER($2)`,
    [chainId, txHash],
  );

  return result.rows[0] ?? null;
}

export async function countActivityItems(transactionId: string): Promise<number> {
  const result = await getPool().query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM collate_activity_items WHERE transaction_id = $1',
    [transactionId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function markActivityPending(id: string, txHash: Hex): Promise<void> {
  await getPool().query(
    `UPDATE collate_activity_transactions
    SET tx_hash = $2, status = 'pending', submitted_at = COALESCE(submitted_at, NOW()),
      failure_reason = NULL, updated_at = NOW()
    WHERE id = $1 AND status IN ('intent', 'pending') AND (tx_hash IS NULL OR LOWER(tx_hash) = LOWER($2))`,
    [id, txHash],
  );
}

export async function markActivityExpired(id: string): Promise<void> {
  await getPool().query(
    `UPDATE collate_activity_transactions
    SET status = 'expired', failure_reason = 'Confirmation window expired.', updated_at = NOW()
    WHERE id = $1 AND status IN ('intent', 'pending')`,
    [id],
  );
}

export async function markActivityReverted(id: string, txHash: Hex): Promise<void> {
  await getPool().query(
    `UPDATE collate_activity_transactions
    SET tx_hash = $2, status = 'reverted', failure_reason = 'Transaction reverted on-chain.',
      submitted_at = COALESCE(submitted_at, NOW()), updated_at = NOW()
    WHERE id = $1 AND status IN ('intent', 'pending')`,
    [id, txHash],
  );
}

export async function confirmActivity(record: ConfirmActivityRecord): Promise<number> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const locked = await client.query<{ status: ActivityTransactionStatus }>(
      'SELECT status FROM collate_activity_transactions WHERE id = $1 FOR UPDATE',
      [record.id],
    );

    if (!locked.rows[0]) {
      throw new Error('Activity intent no longer exists.');
    }

    if (locked.rows[0].status === 'confirmed') {
      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM collate_activity_items WHERE transaction_id = $1',
        [record.id],
      );
      await client.query('COMMIT');
      return Number(existing.rows[0]?.count ?? 0);
    }

    for (const item of record.items) {
      await client.query(
        `INSERT INTO collate_activity_items (
          transaction_id, item_index, item_kind, network, chain_id, tx_hash, creator_wallet,
          protocol_id, atom_data, subject_id, predicate_id, object_id, block_number, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (transaction_id, item_index) DO NOTHING`,
        [
          record.id,
          item.itemIndex,
          item.itemKind,
          record.network,
          record.chainId,
          record.txHash,
          item.creatorWallet,
          item.protocolId,
          item.atomData,
          item.subjectId,
          item.predicateId,
          item.objectId,
          record.blockNumber.toString(),
          record.blockTimestamp,
        ],
      );
    }

    await client.query(
      `UPDATE collate_activity_transactions
      SET tx_hash = $2, status = 'confirmed', expected_wallet = $3, block_number = $4,
        block_timestamp = $5, submitted_at = COALESCE(submitted_at, NOW()), confirmed_at = NOW(),
        failure_reason = NULL, updated_at = NOW()
      WHERE id = $1`,
      [
        record.id,
        record.txHash,
        record.creatorWallet,
        record.blockNumber.toString(),
        record.blockTimestamp,
      ],
    );

    await client.query('COMMIT');
    return record.items.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release?.();
  }
}

export function getActivityDatabasePool(): ActivityPool {
  return getPool();
}
