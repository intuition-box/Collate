import assert from 'node:assert/strict';
import test from 'node:test';

import type { Address, Hex } from 'viem';

import { getDiscoverAtomMetadata } from '../../lib/discover/graph';
import { filterAndSortCollections, groupListEntries, listDistinctMembers, pickRecentBatches } from '../../lib/discover/model';
import { buildCollectionMembersQuery, buildCollectionSummariesQuery, buildRecentBatchesQuery } from '../../lib/discover/queries';
import { getHasTagPredicateTermId } from '../../lib/intuition/list-predicate';
import { getPrimaryNavItems } from '../../lib/navigation/primary-nav';
import { DEFAULT_ADMIN_SETTINGS, validateAdminSettings } from '../../lib/settings/creation-limits';
import type { ActivityItemRecord, ActivityPublish } from '../../types/activity';
import type { DiscoverCollection } from '../../types/discover';

const LIST = `0x${'a'.repeat(64)}` as Hex;
const OTHER_LIST = `0x${'b'.repeat(64)}` as Hex;
const MEMBER = `0x${'c'.repeat(64)}` as Hex;
const OTHER_MEMBER = `0x${'d'.repeat(64)}` as Hex;
const WALLET = `0x${'1'.repeat(40)}` as Address;
const OTHER_WALLET = `0x${'2'.repeat(40)}` as Address;
const UNKNOWN_PREDICATE = `0x${'e'.repeat(64)}` as Hex;

function entry(overrides: Partial<ActivityItemRecord> = {}): ActivityItemRecord {
  return {
    id: '1', kind: 'list_entry', network: 'testnet', txHash: LIST,
    creatorWallet: WALLET, protocolId: LIST, subjectId: MEMBER,
    predicateId: getHasTagPredicateTermId('testnet'), objectId: LIST,
    blockNumber: '100', createdAt: '2026-10-29T10:00:00.000Z', ...overrides,
  };
}

test('settings keep Discover out of navigation until the admin enables it', () => {
  assert.equal(DEFAULT_ADMIN_SETTINGS.showDiscoverInNav, false);
  assert.equal(getPrimaryNavItems().some((item) => item.href === '/discover'), false);
  assert.equal(getPrimaryNavItems({ showActivityInNav: true, showDiscoverInNav: false }).length, 5);
  const enabled = getPrimaryNavItems({ showActivityInNav: true, showDiscoverInNav: true });
  assert.deepEqual(enabled.map((item) => item.href), ['/', '/create', '/discover', '/how-it-works', '/docs', '/activity']);
  assert.equal(validateAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, showDiscoverInNav: true }).showDiscoverInNav, true);
  assert.throws(() => validateAdminSettings({ ...DEFAULT_ADMIN_SETTINGS, showDiscoverInNav: 'yes' }), /Discover visibility/);
});

test('collections only count recognized confirmed-entry shapes, with distinct members and contributors', () => {
  const legacyTestnet = entry({ id: '2', predicateId: getHasTagPredicateTermId('mainnet'), creatorWallet: WALLET, createdAt: '2026-10-29T11:00:00.000Z' });
  const items = [
    entry(), legacyTestnet,
    entry({ id: '3', subjectId: OTHER_MEMBER, creatorWallet: OTHER_WALLET, createdAt: '2026-10-29T12:00:00.000Z' }),
    entry({ id: '4', objectId: OTHER_LIST }),
    entry({ id: '5', predicateId: UNKNOWN_PREDICATE }),
    entry({ id: '6', kind: 'claim' }),
    entry({ id: '7', network: 'mainnet', predicateId: getHasTagPredicateTermId('mainnet') }),
  ];
  const groups = groupListEntries(items, 'testnet');
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], { id: LIST, memberCount: 2, contributorCount: 2, updatedAt: '2026-10-29T12:00:00.000Z' });
  assert.equal(groups[1]?.id, OTHER_LIST);
  assert.deepEqual(listDistinctMembers(items, 'testnet', LIST).map((item) => item.id), ['3', '2']);
  assert.deepEqual(groupListEntries(items, 'mainnet').map((row) => row.id), [LIST]);
});

test('search covers the whole returned set and sorting uses only real counts and dates', () => {
  const base: DiscoverCollection = {
    id: LIST, network: 'testnet', name: 'Internet History', description: 'A shared web archive', image: null,
    memberCount: 2, contributorCount: 1, updatedAt: '2026-10-29T10:00:00.000Z', metadataState: 'ready',
  };
  const collections = [base, { ...base, id: OTHER_LIST, name: 'Climate Science', description: 'An open research list', memberCount: 10, updatedAt: '2026-10-28T10:00:00.000Z' }];
  assert.deepEqual(filterAndSortCollections(collections, 'research', 'recent').map((row) => row.name), ['Climate Science']);
  assert.deepEqual(filterAndSortCollections(collections, '', 'recent').map((row) => row.name), ['Internet History', 'Climate Science']);
  assert.deepEqual(filterAndSortCollections(collections, '', 'members').map((row) => row.name), ['Climate Science', 'Internet History']);
});

test('recent batches exclude single atoms, claims, wrong networks, and unrecognized list predicates', () => {
  const base: ActivityPublish = {
    id: 'a', network: 'testnet', txHash: LIST, creatorWallet: WALLET,
    kind: 'atom', sourceFlow: 'csv_atoms', itemCount: 3, createdAt: '2026-10-29T10:00:00.000Z', previewItems: [],
  };
  const listPreview = { ...entry(), display: { state: 'pending' as const } };
  const batches = pickRecentBatches([
    base,
    { ...base, id: 'single', itemCount: 1 },
    { ...base, id: 'claim', kind: 'claim' },
    { ...base, id: 'other-network', network: 'mainnet' },
    { ...base, id: 'list', kind: 'list_entry', itemCount: 2, previewItems: [listPreview] },
    { ...base, id: 'wrong-predicate', kind: 'list_entry', previewItems: [{ ...listPreview, predicateId: UNKNOWN_PREDICATE }] },
  ], 'testnet');
  assert.deepEqual(batches.map((batch) => [batch.id, batch.atomCount, batch.listEntryCount]), [['a', 3, 0], ['list', 0, 2]]);
});

test('SQL reads confirmed rows, checks predicates, deduplicates members, and pages newest first', () => {
  const summaries = buildCollectionSummariesQuery('testnet');
  assert.match(summaries.text, /publish\.status = 'confirmed'/);
  assert.match(summaries.text, /COUNT\(DISTINCT LOWER\(item\.subject_id\)\)/);
  assert.match(summaries.text, /COUNT\(DISTINCT LOWER\(item\.creator_wallet\)\)/);
  assert.equal((summaries.values[1] as string[]).length, 2);
  assert.deepEqual(buildCollectionSummariesQuery('mainnet', LIST).values[2], LIST);

  const members = buildCollectionMembersQuery('testnet', LIST, '20', 24);
  assert.match(members.text, /ROW_NUMBER\(\) OVER \(PARTITION BY LOWER\(item\.subject_id\)/);
  assert.match(members.text, /ranked\.row_rank = 1/);
  assert.match(members.text, /ranked\.added_at DESC, ranked\.id DESC/);
  assert.deepEqual(members.values.slice(-2), ['20', 25]);

  const batches = buildRecentBatchesQuery('testnet', 6);
  assert.match(batches.text, /publish\.status = 'confirmed'/);
  assert.match(batches.text, /atom_count \+ list_entry_count >= 2/);
  assert.match(batches.text, /LOWER\(item\.predicate_id\) = ANY/);
});

test('graph metadata is bounded and missing or failed IDs remain explicit', async () => {
  const result = await getDiscoverAtomMetadata('testnet', [LIST, OTHER_LIST, LIST], async (_network, ids) => {
    assert.equal(ids.length, 2);
    return [{ term_id: LIST, label: 'Internet History', type: 'Thing', image: null, value: { thing: { description: 'A shared list.' } } }];
  });
  assert.equal(result.details.get(LIST)?.description, 'A shared list.');
  assert.equal(result.details.has(OTHER_LIST), false);
  assert.equal(result.failedIds.size, 0);

  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    const failed = await getDiscoverAtomMetadata('mainnet', [LIST], async () => { throw new Error('Graph unavailable'); });
    assert.equal(failed.failedIds.has(LIST), true);
    assert.equal(failed.details.size, 0);
  } finally {
    console.warn = originalWarn;
  }
});
