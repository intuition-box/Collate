import type { Hex } from 'viem';

import { isGraphTermId } from '@/lib/intuition/graph-detail-route';
import { isHasTagPredicateTermId } from '@/lib/intuition/list-predicate';
import type { ActivityItemRecord, ActivityPublish } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { DiscoverBatch, DiscoverCollection } from '@/types/discover';

export interface CollectionSummaryRow {
  id: Hex;
  memberCount: number;
  contributorCount: number;
  updatedAt: string;
}

export function isVerifiedListEntry(item: ActivityItemRecord, network: PublicIntuitionNetwork): boolean {
  return item.network === network
    && item.kind === 'list_entry'
    && isGraphTermId(item.subjectId ?? '')
    && isGraphTermId(item.objectId ?? '')
    && isHasTagPredicateTermId(network, item.predicateId);
}

export function groupListEntries(items: ActivityItemRecord[], network: PublicIntuitionNetwork): CollectionSummaryRow[] {
  const groups = new Map<string, { members: Set<string>; contributors: Set<string>; updatedAt: string }>();
  for (const item of items) {
    if (!isVerifiedListEntry(item, network)) continue;
    const id = item.objectId!.toLowerCase();
    const group = groups.get(id) ?? { members: new Set<string>(), contributors: new Set<string>(), updatedAt: item.createdAt };
    group.members.add(item.subjectId!.toLowerCase());
    group.contributors.add(item.creatorWallet.toLowerCase());
    if (Date.parse(item.createdAt) > Date.parse(group.updatedAt)) group.updatedAt = item.createdAt;
    groups.set(id, group);
  }
  return [...groups].map(([id, group]) => ({
    id: id as Hex,
    memberCount: group.members.size,
    contributorCount: group.contributors.size,
    updatedAt: group.updatedAt,
  })).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id));
}

export function listDistinctMembers(items: ActivityItemRecord[], network: PublicIntuitionNetwork, listId: string): ActivityItemRecord[] {
  const bySubject = new Map<string, ActivityItemRecord>();
  for (const item of items) {
    if (!isVerifiedListEntry(item, network) || item.objectId!.toLowerCase() !== listId.toLowerCase()) continue;
    const subject = item.subjectId!.toLowerCase();
    const previous = bySubject.get(subject);
    if (!previous || Date.parse(item.createdAt) > Date.parse(previous.createdAt)
      || (item.createdAt === previous.createdAt && BigInt(item.id) > BigInt(previous.id))) {
      bySubject.set(subject, item);
    }
  }
  return [...bySubject.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    || (BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0));
}

export function pickRecentBatches(publishes: ActivityPublish[], network: PublicIntuitionNetwork): DiscoverBatch[] {
  return publishes.filter((publish) => publish.network === network
    && publish.itemCount >= 2
    && (publish.kind === 'atom' || publish.kind === 'list_entry')
    && (publish.kind !== 'list_entry' || publish.previewItems.every((item) => isHasTagPredicateTermId(network, item.predicateId))))
    .map((publish) => ({
      id: publish.id,
      network,
      txHash: publish.txHash,
      creatorWallet: publish.creatorWallet,
      atomCount: publish.kind === 'atom' ? publish.itemCount : 0,
      listEntryCount: publish.kind === 'list_entry' ? publish.itemCount : 0,
      createdAt: publish.createdAt,
    }));
}

export type CollectionSort = 'recent' | 'members';

export function filterAndSortCollections(collections: DiscoverCollection[], query: string, sort: CollectionSort): DiscoverCollection[] {
  const normalizedQuery = query.trim().toLowerCase();
  return collections.filter((collection) => !normalizedQuery
    || `${collection.name ?? ''} ${collection.description ?? ''}`.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => (sort === 'members' ? b.memberCount - a.memberCount : 0)
      || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      || a.id.localeCompare(b.id));
}
