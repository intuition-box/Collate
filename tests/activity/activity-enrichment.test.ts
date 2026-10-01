import assert from 'node:assert/strict';
import test from 'node:test';

import type { Hex } from 'viem';

import { enrichActivityItems, type ActivityAtomFetcher } from '../../lib/activity/enrich-items';
import type { ActivityItemRecord } from '../../types/activity';

const id = (character: string) => `0x${character.repeat(64)}` as Hex;
const CREATOR = `0x${'1'.repeat(40)}` as Hex;

function item(
  recordId: string,
  network: ActivityItemRecord['network'],
  kind: ActivityItemRecord['kind'],
  protocolId: Hex,
  subjectId: Hex | null = null,
  predicateId: Hex | null = null,
  objectId: Hex | null = null,
): ActivityItemRecord {
  return {
    id: recordId,
    network,
    kind,
    protocolId,
    subjectId,
    predicateId,
    objectId,
    txHash: id('f'),
    creatorWallet: CREATOR,
    blockNumber: '42',
    createdAt: '2026-09-30T00:00:00.000Z',
  };
}

test('enriches older atom records by protocol ID without collapsing same-name atoms or changing page order', async () => {
  const rows = [
    item('9', 'testnet', 'atom', id('a')),
    item('8', 'mainnet', 'atom', id('a')),
    item('7', 'testnet', 'atom', id('b')),
  ];
  const calls: Array<{ network: string; ids: string[] }> = [];
  const fetcher: ActivityAtomFetcher = async (network, ids, signal) => {
    assert.equal(signal.aborted, false);
    calls.push({ network, ids });
    return ids.map((termId) => ({
      term_id: termId,
      label: 'Same name',
      type: 'Thing',
      image: null,
      value: { thing: { description: `${network} ${termId}`, image: 'ipfs://picture', url: 'https://example.org' } },
    }));
  };

  const enriched = await enrichActivityItems(rows, fetcher);
  assert.deepEqual(enriched.map((row) => row.id), ['9', '8', '7']);
  assert.equal(enriched.length, rows.length);
  assert.deepEqual(calls.map((call) => [call.network, call.ids.length]).sort(), [['mainnet', 1], ['testnet', 2]]);
  assert.equal(enriched[0]?.display.state, 'ready');
  assert.equal(enriched[1]?.display.state, 'ready');
  assert.equal(enriched[2]?.display.state, 'ready');
  if (enriched[0]?.display.atom && enriched[1]?.display.atom && enriched[2]?.display.atom) {
    assert.notEqual(enriched[0].display.atom.description, enriched[1].display.atom.description);
    assert.notEqual(enriched[0].display.atom.description, enriched[2].display.atom.description);
    assert.equal(enriched[0].display.atom.image, 'ipfs://picture');
    assert.equal(enriched[0].display.atom.url, 'https://example.org');
  } else {
    assert.fail('Expected atom details for each record.');
  }
});

test('resolves list members and generic claims from subject, predicate, and object, sharing repeated IDs', async () => {
  const member = id('a');
  const predicate = id('b');
  const list = id('c');
  const rows = [
    item('3', 'testnet', 'list_entry', id('d'), member, predicate, list),
    item('2', 'testnet', 'claim', id('e'), member, predicate, list),
  ];
  const fetcher: ActivityAtomFetcher = async (_network, ids) => {
    assert.equal(ids.length, 3);
    return ids.map((termId) => ({
      term_id: termId,
      label: termId === member ? 'Netflix' : termId === list ? 'Watchlist' : 'has tag',
      type: 'Thing',
      value: { thing: { description: 'A useful description.' } },
    }));
  };

  const enriched = await enrichActivityItems(rows, fetcher);
  for (const entry of enriched) {
    assert.equal(entry.display.state, 'ready');
    if (!entry.display.triple) assert.fail('Expected three resolved claim atoms.');
    assert.equal(entry.display.triple.subject?.label, 'Netflix');
    assert.equal(entry.display.triple.predicate?.label, 'has tag');
    assert.equal(entry.display.triple.object?.label, 'Watchlist');
  }
});

test('keeps partial and unindexed creations visible while other rows resolve', async () => {
  const rows = [
    item('3', 'testnet', 'list_entry', id('d'), id('a'), id('b'), id('c')),
    item('2', 'testnet', 'atom', id('e')),
    item('1', 'testnet', 'atom', id('f')),
  ];
  const fetcher: ActivityAtomFetcher = async () => [
    { term_id: id('a'), label: 'Member', type: 'Thing' },
    { term_id: id('c'), label: 'List', type: 'Thing' },
    { term_id: id('e'), label: 'Ready atom', type: 'Thing' },
  ];

  const enriched = await enrichActivityItems(rows, fetcher);
  assert.deepEqual(enriched.map((entry) => entry.display.state), ['partial', 'ready', 'pending']);
  assert.equal(enriched[0]?.display.triple?.predicate, null);
  if (enriched[0]?.display.state !== 'partial') assert.fail('Expected partial claim details.');
  assert.equal(enriched[0].display.reason, 'pending');
});

test('a graph failure affects only its network and returns unavailable instead of losing activity', async () => {
  const rows = [item('2', 'mainnet', 'atom', id('a')), item('1', 'testnet', 'atom', id('b'))];
  const previousWarn = console.warn;
  console.warn = () => undefined;
  try {
    const enriched = await enrichActivityItems(rows, async (network, ids) => {
      if (network === 'mainnet') throw new Error('Graph unavailable');
      return [{ term_id: ids[0]!, label: 'Testnet atom', type: 'Thing' }];
    });
    assert.deepEqual(enriched.map((entry) => entry.display.state), ['unavailable', 'ready']);
  } finally {
    console.warn = previousWarn;
  }
});

test('graph requests stay bounded for a full activity page', async () => {
  const rows = Array.from({ length: 100 }, (_, index) =>
    item(String(100 - index), 'testnet', 'atom', `0x${index.toString(16).padStart(64, '0')}` as Hex),
  );
  const sizes: number[] = [];
  const enriched = await enrichActivityItems(rows, async (_network, ids) => {
    sizes.push(ids.length);
    return [];
  });

  assert.deepEqual(sizes.sort((left, right) => left - right), [20, 80]);
  assert.equal(enriched.length, 100);
  assert.deepEqual(enriched.map((entry) => entry.id), rows.map((entry) => entry.id));
  assert.ok(enriched.every((entry) => entry.display.state === 'pending'));
});
