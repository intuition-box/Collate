import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGraphDetail,
  mapAtomDetail,
  mapTripleDetail,
} from '../../lib/intuition/graph-detail';
import { getGraphDetailHref, parseGraphDetailRoute } from '../../lib/intuition/graph-detail-route';

const id = (character: string) => `0x${character.repeat(64)}`;

test('graph detail routes validate network, kind, and full term IDs', () => {
  assert.deepEqual(parseGraphDetailRoute({ network: 'testnet', kind: 'atom', id: id('A') }), {
    network: 'testnet', kind: 'atom', id: id('a'),
  });
  assert.deepEqual(parseGraphDetailRoute({ network: 'mainnet', kind: 'triple', id: id('b') }), {
    network: 'mainnet', kind: 'triple', id: id('b'),
  });
  assert.equal(parseGraphDetailRoute({ network: 'other', kind: 'atom', id: id('a') }), null);
  assert.equal(parseGraphDetailRoute({ network: 'testnet', kind: 'claim', id: id('a') }), null);
  assert.equal(parseGraphDetailRoute({ network: 'testnet', kind: 'atom', id: '0x123' }), null);
  assert.equal(getGraphDetailHref('testnet', 'atom', id('A')), `/explore/testnet/atom/${id('a')}`);
  assert.equal(getGraphDetailHref('mainnet', 'triple', id('b')), `/explore/mainnet/triple/${id('b')}`);
  assert.throws(() => getGraphDetailHref('testnet', 'atom', 'bad'), /Invalid graph term ID/);
});

test('atom detail maps image-rich metadata, creator, and date without requiring Collate records', () => {
  const detail = mapAtomDetail({
    term_id: id('a'),
    label: 'Knowledge Garden',
    type: 'Thing',
    image: 'https://example.org/fallback.png',
    value: { thing: { description: 'A shared place for ideas.', image: 'ipfs://garden', url: 'https://example.org' } },
    creator: { label: 'pixi3.eth' },
    created_at: '2026-09-30T18:00:00Z',
  });

  assert.equal(detail?.kind, 'atom');
  if (detail?.kind !== 'atom') assert.fail('Expected atom detail.');
  assert.equal(detail.atom.label, 'Knowledge Garden');
  assert.equal(detail.atom.image, 'ipfs://garden');
  assert.equal(detail.atom.description, 'A shared place for ideas.');
  assert.equal(detail.atom.url, 'https://example.org');
  assert.equal(detail.creatorLabel, 'pixi3.eth');
  assert.equal(detail.createdAt, '2026-09-30T18:00:00Z');
  assert.equal(mapAtomDetail(null), null);
});

test('triple detail keeps same-name component atoms separate by ID', () => {
  const detail = mapTripleDetail({
    term_id: id('d'),
    created_at: '2026-09-30T18:00:00Z',
    subject: { term_id: id('a'), label: 'Same name', type: 'Thing', value: { thing: { description: 'Member.' } } },
    predicate: { term_id: id('b'), label: 'has tag', type: 'Thing' },
    object: { term_id: id('c'), label: 'Same name', type: 'Thing', value: { thing: { description: 'List.' } } },
  });

  assert.equal(detail?.kind, 'triple');
  if (detail?.kind !== 'triple') assert.fail('Expected triple detail.');
  assert.equal(detail.subject?.label, detail.object?.label);
  assert.notEqual(detail.subject?.termId, detail.object?.termId);
  assert.equal(detail.subject?.description, 'Member.');
  assert.equal(detail.object?.description, 'List.');
  assert.equal(mapTripleDetail(null), null);
});

test('detail queries use the selected network and return pending when the graph has not indexed a term', async () => {
  const route = parseGraphDetailRoute({ network: 'mainnet', kind: 'triple', id: id('d') });
  if (!route) assert.fail('Expected valid route.');

  const result = await getGraphDetail(route, async (network, query, variables, signal) => {
    assert.equal(network, 'mainnet');
    assert.match(query, /triple\(term_id: \$id\)/);
    assert.deepEqual(variables, { id: id('d') });
    assert.equal(signal.aborted, false);
    return { triple: null };
  });
  assert.deepEqual(result, { state: 'pending' });
});

test('detail lookup returns atom data and preserves a clear failure state', async () => {
  const route = parseGraphDetailRoute({ network: 'testnet', kind: 'atom', id: id('a') });
  if (!route) assert.fail('Expected valid route.');

  const ready = await getGraphDetail(route, async (network, query, variables) => {
    assert.equal(network, 'testnet');
    assert.match(query, /atom\(term_id: \$id\)/);
    assert.deepEqual(variables, { id: id('a') });
    return { atom: { term_id: id('a'), label: 'A new atom', type: 'Thing' } };
  });
  assert.equal(ready.state, 'ready');
  if (ready.state !== 'ready' || ready.detail.kind !== 'atom') assert.fail('Expected ready atom.');
  assert.equal(ready.detail.atom.label, 'A new atom');

  const previousWarn = console.warn;
  console.warn = () => undefined;
  try {
    const unavailable = await getGraphDetail(route, async () => { throw new Error('Upstream failed'); });
    assert.deepEqual(unavailable, { state: 'unavailable' });
  } finally {
    console.warn = previousWarn;
  }
});
