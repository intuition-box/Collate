import type { Address, Hex } from 'viem';

import { getActivityDatabasePool } from '@/lib/activity/database';
import { readRemoteActivityItems, readRemoteActivityPublishes, shouldReadRemoteActivity } from '@/lib/activity/remote-read';
import { getDiscoverAtomMetadata } from '@/lib/discover/graph';
import { groupListEntries, listDistinctMembers, pickRecentBatches, type CollectionSummaryRow } from '@/lib/discover/model';
import { buildCollectionMembersQuery, buildCollectionSummariesQuery, buildRecentBatchesQuery } from '@/lib/discover/queries';
import type { ActivityItemRecord } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { DiscoverBatch, DiscoverCollection, DiscoverCollectionDetailResponse, DiscoverMember } from '@/types/discover';

const REMOTE_CACHE_MS = 30_000;
const RECENT_BATCH_LIMIT = 6;

interface CollectionDatabaseRow {
  id: Hex;
  member_count: string;
  contributor_count: string;
  updated_at: Date | string;
}

interface MemberDatabaseRow {
  id: string;
  subject_id: Hex;
  creator_wallet: Address;
  added_at: Date | string;
}

interface BatchDatabaseRow {
  id: string;
  network: PublicIntuitionNetwork;
  tx_hash: Hex;
  expected_wallet: Address;
  atom_count: number;
  list_entry_count: number;
  created_at: Date | string;
}

const remoteEntries = new Map<PublicIntuitionNetwork, { expiresAt: number; promise: Promise<ActivityItemRecord[]> }>();

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

async function readAllRemoteListEntries(network: PublicIntuitionNetwork): Promise<ActivityItemRecord[]> {
  const cached = remoteEntries.get(network);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = (async () => {
    const entries: ActivityItemRecord[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = await readRemoteActivityItems({ network, kind: 'list_entry', wallet: null, cursor, limit: 100 });
      entries.push(...page.items);
      cursor = page.nextCursor;
      if (cursor && seenCursors.has(cursor)) throw new Error('Live activity pagination did not advance.');
      if (cursor) seenCursors.add(cursor);
    } while (cursor);
    return entries;
  })();
  remoteEntries.set(network, { expiresAt: Date.now() + REMOTE_CACHE_MS, promise });
  try {
    return await promise;
  } catch (error) {
    remoteEntries.delete(network);
    throw error;
  }
}

async function getSummaryRows(network: PublicIntuitionNetwork, id?: string): Promise<CollectionSummaryRow[]> {
  if (shouldReadRemoteActivity()) {
    const rows = groupListEntries(await readAllRemoteListEntries(network), network);
    return id ? rows.filter((row) => row.id === id.toLowerCase()) : rows;
  }
  const query = buildCollectionSummariesQuery(network, id);
  const result = await getActivityDatabasePool().query<CollectionDatabaseRow>(query.text, query.values);
  return result.rows.map((row) => ({
    id: row.id,
    memberCount: Number(row.member_count),
    contributorCount: Number(row.contributor_count),
    updatedAt: toIso(row.updated_at),
  }));
}

function decorateCollection(
  network: PublicIntuitionNetwork,
  row: CollectionSummaryRow,
  graph: Awaited<ReturnType<typeof getDiscoverAtomMetadata>>,
): DiscoverCollection {
  const id = row.id.toLowerCase();
  const details = graph.details.get(id);
  return {
    ...row,
    network,
    name: details?.label ?? null,
    description: details?.description ?? null,
    image: details?.image ?? null,
    metadataState: details ? 'ready' : graph.failedIds.has(id) ? 'unavailable' : 'pending',
  };
}

export async function getDiscoverCollections(network: PublicIntuitionNetwork): Promise<DiscoverCollection[]> {
  const rows = await getSummaryRows(network);
  if (rows.length === 0) return [];
  const graph = await getDiscoverAtomMetadata(network, rows.map((row) => row.id));
  return rows.map((row) => decorateCollection(network, row, graph));
}

async function getMemberRows(network: PublicIntuitionNetwork, listId: string, cursor: string | null, limit: number) {
  if (shouldReadRemoteActivity()) {
    const all = listDistinctMembers(await readAllRemoteListEntries(network), network, listId);
    const cursorIndex = cursor ? all.findIndex((item) => item.id === cursor) : -1;
    if (cursor && cursorIndex < 0) throw new Error('Member cursor is no longer available.');
    const rows = all.slice(cursorIndex + 1, cursorIndex + limit + 2).map((item) => ({
      id: item.id,
      subject_id: item.subjectId!,
      creator_wallet: item.creatorWallet,
      added_at: item.createdAt,
    }));
    return rows;
  }
  const query = buildCollectionMembersQuery(network, listId, cursor, limit);
  const result = await getActivityDatabasePool().query<MemberDatabaseRow>(query.text, query.values);
  return result.rows;
}

export async function getDiscoverCollectionDetail(
  network: PublicIntuitionNetwork,
  listId: string,
  cursor: string | null,
  limit: number,
): Promise<DiscoverCollectionDetailResponse | null> {
  const [summaries, memberRows] = await Promise.all([
    getSummaryRows(network, listId),
    getMemberRows(network, listId, cursor, limit),
  ]);
  const summary = summaries[0];
  if (!summary) return null;

  const hasMore = memberRows.length > limit;
  const rows = memberRows.slice(0, limit);
  const graph = await getDiscoverAtomMetadata(network, [listId, ...rows.map((row) => row.subject_id)]);
  const members: DiscoverMember[] = rows.map((row) => {
    const atomId = row.subject_id.toLowerCase() as Hex;
    const details = graph.details.get(atomId);
    return {
      id: row.id,
      atomId,
      creatorWallet: row.creator_wallet,
      addedAt: toIso(row.added_at),
      name: details?.label ?? null,
      description: details?.description ?? null,
      image: details?.image ?? null,
      metadataState: details ? 'ready' : graph.failedIds.has(atomId) ? 'unavailable' : 'pending',
    };
  });
  return {
    collection: decorateCollection(network, summary, graph),
    members,
    nextCursor: hasMore ? rows.at(-1)?.id ?? null : null,
  };
}

export async function getDiscoverRecentBatches(network: PublicIntuitionNetwork): Promise<DiscoverBatch[]> {
  if (shouldReadRemoteActivity()) {
    const batches: DiscoverBatch[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = await readRemoteActivityPublishes({ network, cursor, limit: 50 });
      batches.push(...pickRecentBatches(page.publishes, network));
      cursor = page.nextCursor;
      if (cursor && seenCursors.has(cursor)) throw new Error('Live activity pagination did not advance.');
      if (cursor) seenCursors.add(cursor);
    } while (cursor && batches.length < RECENT_BATCH_LIMIT);
    return batches.slice(0, RECENT_BATCH_LIMIT);
  }

  const query = buildRecentBatchesQuery(network, RECENT_BATCH_LIMIT);
  const result = await getActivityDatabasePool().query<BatchDatabaseRow>(query.text, query.values);
  return result.rows.map((row) => ({
    id: row.id,
    network: row.network,
    txHash: row.tx_hash,
    creatorWallet: row.expected_wallet,
    atomCount: Number(row.atom_count),
    listEntryCount: Number(row.list_entry_count),
    createdAt: toIso(row.created_at),
  }));
}
