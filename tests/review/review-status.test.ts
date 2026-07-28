import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAtomReviewRows } from '@/lib/intuition/atom-duplicates';
import { buildListReviewRows } from '@/lib/intuition/list-duplicates';
import type { AtomDraft, PreparedAtomDraft } from '@/types/atoms';
import type { ListMemberRow, PreparedListEntry } from '@/types/lists';

test('buildAtomReviewRows marks existing and duplicate rows', () => {
  const drafts: AtomDraft[] = [
    {
      id: 'a1',
      schemaType: 'Raw',
      name: '',
      description: '',
      url: '',
      image: '',
      email: '',
      identifier: '',
      accountChainId: '1',
      accountAddress: '',
      rawData: 'alpha',
      support: '',
    },
    {
      id: 'a2',
      schemaType: 'Raw',
      name: '',
      description: '',
      url: '',
      image: '',
      email: '',
      identifier: '',
      accountChainId: '1',
      accountAddress: '',
      rawData: 'alpha',
      support: '',
    },
    {
      id: 'a3',
      schemaType: 'Raw',
      name: '',
      description: '',
      url: '',
      image: '',
      email: '',
      identifier: '',
      accountChainId: '1',
      accountAddress: '',
      rawData: 'beta',
      support: '',
    },
  ];

  const prepared: PreparedAtomDraft[] = [
    { id: 'a1', displayName: 'alpha', dataString: 'alpha', atomId: '0x01', assetWei: 1n, supportWei: 0n, existsOnChain: false },
    { id: 'a2', displayName: 'alpha', dataString: 'alpha', atomId: '0x02', assetWei: 1n, supportWei: 0n, existsOnChain: false },
    { id: 'a3', displayName: 'beta', dataString: 'beta', atomId: '0x03', assetWei: 1n, supportWei: 0n, existsOnChain: true },
  ];

  const rows = buildAtomReviewRows(drafts, prepared);

  assert.equal(rows[0]?.status, 'blocked_duplicate');
  assert.equal(rows[1]?.status, 'blocked_duplicate');
  assert.equal(rows[2]?.status, 'existing');
});

test('buildListReviewRows marks existing and duplicate list entries', () => {
  const rows: ListMemberRow[] = [
    { id: 'm1', memberName: 'Alpha', memberDescription: '', selectedAtom: { termId: '0x11', label: 'Alpha', type: 'Thing', data: null, description: null, image: null, url: null, creatorId: null, creatorLabel: null, positionCount: 0, totalShares: '0' }, candidates: [] },
    { id: 'm2', memberName: 'Alpha', memberDescription: '', selectedAtom: { termId: '0x11', label: 'Alpha', type: 'Thing', data: null, description: null, image: null, url: null, creatorId: null, creatorLabel: null, positionCount: 0, totalShares: '0' }, candidates: [] },
    { id: 'm3', memberName: 'Beta', memberDescription: '', selectedAtom: { termId: '0x12', label: 'Beta', type: 'Thing', data: null, description: null, image: null, url: null, creatorId: null, creatorLabel: null, positionCount: 0, totalShares: '0' }, candidates: [] },
  ];

  const prepared: PreparedListEntry[] = [
    { id: 'm1', listTermId: '0xaa', memberTermId: '0x11', tripleId: '0xff', assetWei: 1n, alreadyExistsOnChain: false },
    { id: 'm2', listTermId: '0xaa', memberTermId: '0x11', tripleId: '0xff', assetWei: 1n, alreadyExistsOnChain: false },
    { id: 'm3', listTermId: '0xaa', memberTermId: '0x12', tripleId: '0xee', assetWei: 1n, alreadyExistsOnChain: true },
  ];

  const review = buildListReviewRows(rows, prepared);

  assert.equal(review[0]?.status, 'blocked_duplicate');
  assert.equal(review[1]?.status, 'blocked_duplicate');
  assert.equal(review[2]?.status, 'skip_existing');
});

test('buildListReviewRows keeps same-name alternatives eligible without overriding blockers', () => {
  const selected = {
    termId: '0x21' as const,
    label: 'Netflix',
    type: 'Thing',
    data: null,
    description: 'Subscription streaming service.',
    image: null,
    url: null,
    creatorId: null,
    creatorLabel: null,
    positionCount: 0,
    totalShares: '0',
  };
  const alternative = {
    ...selected,
    termId: '0x22' as const,
    description: 'A protocol project using the same name.',
  };
  const rows: ListMemberRow[] = [
    { id: 'm1', memberName: 'Netflix', memberDescription: selected.description, selectedAtom: selected, candidates: [selected, alternative] },
    { id: 'm2', memberName: 'Netflix', memberDescription: selected.description, selectedAtom: selected, candidates: [selected, alternative] },
    { id: 'm3', memberName: 'Netflix', memberDescription: selected.description, selectedAtom: selected, candidates: [selected, alternative] },
    { id: 'm4', memberName: 'Netflix', memberDescription: selected.description, selectedAtom: selected, candidates: [selected, alternative] },
  ];
  const prepared: PreparedListEntry[] = [
    { id: 'm1', listTermId: '0xaa', memberTermId: selected.termId, tripleId: '0xa1', assetWei: 1n, alreadyExistsOnChain: false },
    { id: 'm2', listTermId: '0xaa', memberTermId: selected.termId, tripleId: '0xb1', assetWei: 1n, alreadyExistsOnChain: true },
    { id: 'm3', listTermId: '0xaa', memberTermId: selected.termId, tripleId: '0xc1', assetWei: 1n, alreadyExistsOnChain: false },
    { id: 'm4', listTermId: '0xaa', memberTermId: selected.termId, tripleId: '0xc1', assetWei: 1n, alreadyExistsOnChain: false },
  ];

  const review = buildListReviewRows(rows, prepared);

  assert.equal(review[0]?.status, 'ready_with_matches');
  assert.equal(review[1]?.status, 'skip_existing');
  assert.equal(review[2]?.status, 'blocked_duplicate');
  assert.equal(review[3]?.status, 'blocked_duplicate');
});
