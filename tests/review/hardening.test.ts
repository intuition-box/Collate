import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAtomReviewRows } from '@/lib/intuition/atom-duplicates';
import {
  chooseUniqueCandidateByDescription,
  getExactLabelCandidates,
  reviewCsvBatchLists,
} from '@/lib/intuition/csv-batch-lists';
import { getCreatablePreparedAtoms, publishManualBatchAtoms } from '@/lib/intuition/manual-batch-atoms';
import { getCreatablePreparedListEntries, publishManualBatchLists } from '@/lib/intuition/manual-batch-lists';
import { prepareCreateAtomsTransaction, prepareCreateTriplesTransaction } from '@/lib/intuition/tx-prepare';
import { getPublishDisabledReason } from '@/lib/utils/publish-state';
import type { IntuitionAtomSearchResult } from '@/types/api';
import type { AtomDraft, AtomReviewRow, PreparedAtomDraft } from '@/types/atoms';
import type { CsvListParseRow, ManualListReviewRow, PreparedListEntry } from '@/types/lists';

const listAtom: IntuitionAtomSearchResult = {
  termId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  label: 'Layer One List',
  type: 'Thing',
  data: null,
  description: null,
  image: null,
  url: null,
  creatorId: null,
  creatorLabel: null,
  positionCount: 0,
  totalShares: '0',
};

function candidate(
  termId: `0x${string}`,
  description: string | null,
  overrides: Partial<IntuitionAtomSearchResult> = {},
): IntuitionAtomSearchResult {
  return {
    ...listAtom,
    termId,
    label: 'Netflix',
    description,
    ...overrides,
  };
}

test('getExactLabelCandidates excludes partial and unrelated atom labels', () => {
  const exact = candidate('0x1111', 'Streaming service');
  const differentlyCased = candidate('0x2222', 'Media company', { label: '  NETFLIX  ' });
  const partial = candidate('0x3333', 'Fan account', { label: 'Netflix Fans' });

  assert.deepEqual(getExactLabelCandidates([partial, exact, differentlyCased], 'Netflix'), [exact, differentlyCased]);
});

test('chooseUniqueCandidateByDescription resolves one exact normalized description match', () => {
  const expected = candidate('0x1111', 'Subscription streaming service and production company.');
  const other = candidate('0x2222', 'A protocol project using the same name.');

  assert.equal(
    chooseUniqueCandidateByDescription(
      [other, expected],
      '  Subscription streaming service and production company! ',
    ),
    expected,
  );
});

test('chooseUniqueCandidateByDescription accepts one substantial containment match', () => {
  const expected = candidate(
    '0x1111',
    'Netflix is a subscription streaming service and production company based in California.',
  );
  const other = candidate('0x2222', 'A decentralized media curation community.');

  assert.equal(
    chooseUniqueCandidateByDescription(
      [other, expected],
      'Subscription streaming service and production company based in California',
    ),
    expected,
  );
});

test('chooseUniqueCandidateByDescription keeps tied, weak, and missing metadata ambiguous', () => {
  const first = candidate('0x1111', 'Subscription streaming service.');
  const second = candidate('0x2222', 'Subscription streaming service.');
  const unrelated = candidate('0x3333', 'A decentralized media curation community.');

  assert.equal(chooseUniqueCandidateByDescription([first, second], 'Subscription streaming service'), null);
  assert.equal(chooseUniqueCandidateByDescription([first, unrelated], 'Streaming entertainment'), null);
  assert.equal(chooseUniqueCandidateByDescription([first, unrelated], ''), null);
});

test('buildAtomReviewRows uses skip_existing when an explicit existing match is provided', () => {
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
  ];

  const prepared: PreparedAtomDraft[] = [
    { id: 'a1', displayName: 'alpha', dataString: 'alpha', atomId: '0x01', assetWei: 1n, supportWei: 0n, existsOnChain: true },
  ];

  const rows = buildAtomReviewRows(drafts, prepared, new Map([['a1', listAtom]]));

  assert.equal(rows[0]?.status, 'skip_existing');
  assert.match(rows[0]?.message ?? '', /will be skipped/i);
});

test('reviewCsvBatchLists marks ambiguous and missing rows without needing chain reads', async () => {
  const parsedRows: CsvListParseRow[] = [
    {
      row: {
        id: 'm1',
        sourceLine: 2,
        memberName: 'Alpha',
        memberDescription: '',
        selectedAtom: null,
        candidates: [
          { ...listAtom, termId: '0x1111111111111111111111111111111111111111111111111111111111111111', label: 'Alpha' },
          { ...listAtom, termId: '0x1212121212121212121212121212121212121212121212121212121212121212', label: 'Alpha Protocol' },
        ],
      },
      errors: [],
    },
    {
      row: {
        id: 'm2',
        sourceLine: 3,
        memberName: 'Missing',
        memberDescription: '',
        selectedAtom: null,
        candidates: [],
      },
      errors: [],
    },
  ];

  const publicClient = {
    readContract: async () => {
      throw new Error('readContract should not be called for unresolved rows');
    },
  } as never;

  const rows = await reviewCsvBatchLists({
    listAtom,
    parsedRows,
    network: 'testnet',
    publicClient,
  });

  assert.equal(rows[0]?.status, 'ambiguous');
  assert.equal(rows[1]?.status, 'missing');
});

test('getCreatablePreparedAtoms only returns ready atom rows', () => {
  const preparedAtom: PreparedAtomDraft = {
    id: 'a1',
    displayName: 'alpha',
    dataString: 'alpha',
    atomId: '0x0101010101010101010101010101010101010101010101010101010101010101',
    assetWei: 2n,
    supportWei: 0n,
    existsOnChain: false,
  };
  const rows: AtomReviewRow[] = [
    { id: 'a1', label: 'alpha', status: 'ready_to_create', message: 'ready', payload: { draft: {} as AtomDraft, prepared: preparedAtom } },
    { id: 'a2', label: 'beta', status: 'existing', message: 'skip', payload: { draft: {} as AtomDraft } },
  ];

  assert.deepEqual(getCreatablePreparedAtoms(rows), [preparedAtom]);
});

test('getCreatablePreparedListEntries only returns ready list rows', () => {
  const preparedEntry: PreparedListEntry = {
    id: 'm1',
    listTermId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    memberTermId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    tripleId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    assetWei: 3n,
    alreadyExistsOnChain: false,
  };
  const rows: ManualListReviewRow[] = [
    { id: 'm1', label: 'Alpha', status: 'ready_to_create', message: 'ready', payload: { row: {} as never, prepared: preparedEntry } },
    { id: 'm2', label: 'Beta', status: 'skip_existing', message: 'skip', payload: { row: {} as never } },
  ];

  assert.deepEqual(getCreatablePreparedListEntries(rows), [preparedEntry]);
});

test('prepareCreateAtomsTransaction includes only eligible atom payload assets', () => {
  const prepared = prepareCreateAtomsTransaction([
    {
      id: 'a1',
      displayName: 'alpha',
      dataString: 'alpha',
      atomId: '0x0101010101010101010101010101010101010101010101010101010101010101',
      assetWei: 2n,
      supportWei: 0n,
      existsOnChain: false,
    },
    {
      id: 'a2',
      displayName: 'beta',
      dataString: 'beta',
      atomId: '0x0202020202020202020202020202020202020202020202020202020202020202',
      assetWei: 5n,
      supportWei: 0n,
      existsOnChain: false,
    },
  ]);

  assert.equal(prepared.value, 7n);
});

test('prepareCreateTriplesTransaction includes only eligible list entry assets', () => {
  const prepared = prepareCreateTriplesTransaction([
    {
      id: 'm1',
      listTermId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      memberTermId: '0x1111111111111111111111111111111111111111111111111111111111111111',
      tripleId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      assetWei: 3n,
      alreadyExistsOnChain: false,
    },
    {
      id: 'm2',
      listTermId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      memberTermId: '0x1212121212121212121212121212121212121212121212121212121212121212',
      tripleId: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      assetWei: 4n,
      alreadyExistsOnChain: false,
    },
  ]);

  assert.equal(prepared.value, 7n);
});

test('getPublishDisabledReason explains zero eligible rows clearly', () => {
  const reason = getPublishDisabledReason({
    hasReview: true,
    eligibleCount: 0,
    walletReady: true,
    hasNetworkMismatch: false,
    networkName: 'Intuition Testnet',
    isBusy: false,
    subjectLabel: 'CSV list',
  });

  assert.match(reason ?? '', /no csv list rows are eligible/i);
});

test('getPublishDisabledReason explains wallet and network blockers clearly', () => {
  const noWallet = getPublishDisabledReason({
    hasReview: true,
    eligibleCount: 1,
    walletReady: false,
    hasNetworkMismatch: false,
    networkName: 'Intuition Testnet',
    isBusy: false,
    subjectLabel: 'atom',
  });
  const wrongNetwork = getPublishDisabledReason({
    hasReview: true,
    eligibleCount: 1,
    walletReady: true,
    hasNetworkMismatch: true,
    networkName: 'Intuition Mainnet',
    isBusy: false,
    subjectLabel: 'list entry',
  });

  assert.match(noWallet ?? '', /connect a wallet/i);
  assert.match(wrongNetwork ?? '', /switch your wallet/i);
});

test('publishManualBatchAtoms returns no_write_needed when no atoms are eligible', async () => {
  const result = await publishManualBatchAtoms({
    atoms: [],
    network: 'testnet',
    publicClient: {} as never,
    walletClient: {} as never,
    walletAddress: '0x1234' as never,
  });

  assert.equal(result.kind, 'no_write_needed');
});

test('publishManualBatchLists returns no_write_needed when no list entries are eligible', async () => {
  const result = await publishManualBatchLists({
    entries: [],
    network: 'testnet',
    publicClient: {} as never,
    walletClient: {} as never,
    walletAddress: '0x1234' as never,
  });

  assert.equal(result.kind, 'no_write_needed');
});

test('publish helpers surface transaction failures', async () => {
  const publicClient = {
    waitForTransactionReceipt: async () => ({ status: 'success' }),
  } as never;
  const walletClient = {
    sendTransaction: async () => {
      throw new Error('User rejected request');
    },
  } as never;

  await assert.rejects(
    () =>
      publishManualBatchAtoms({
        atoms: [{ id: 'a1', displayName: 'alpha', dataString: 'alpha', atomId: '0x01', assetWei: 1n, supportWei: 0n, existsOnChain: false }],
        network: 'testnet',
        publicClient,
        walletClient,
        walletAddress: '0x1111111111111111111111111111111111111111',
      }),
    /User rejected request/,
  );

  await assert.rejects(
    () =>
      publishManualBatchLists({
        entries: [
          {
            id: 'm1',
            listTermId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            memberTermId: '0x1111111111111111111111111111111111111111111111111111111111111111',
            tripleId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            assetWei: 1n,
            alreadyExistsOnChain: false,
          },
        ],
        network: 'testnet',
        publicClient,
        walletClient,
        walletAddress: '0x1111111111111111111111111111111111111111',
      }),
    /User rejected request/,
  );
});

test('publish helpers reject reverted on-chain receipts', async () => {
  const publicClient = {
    waitForTransactionReceipt: async () => ({ status: 'reverted' }),
  } as never;
  const walletClient = {
    sendTransaction: async () => '0x1111111111111111111111111111111111111111111111111111111111111111',
  } as never;

  await assert.rejects(
    () =>
      publishManualBatchAtoms({
        atoms: [{ id: 'a1', displayName: 'alpha', dataString: 'alpha', atomId: '0x01', assetWei: 1n, supportWei: 0n, existsOnChain: false }],
        network: 'testnet',
        publicClient,
        walletClient,
        walletAddress: '0x1111111111111111111111111111111111111111',
      }),
    /reverted on-chain/i,
  );

  await assert.rejects(
    () =>
      publishManualBatchLists({
        entries: [
          {
            id: 'm1',
            listTermId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            memberTermId: '0x1111111111111111111111111111111111111111111111111111111111111111',
            tripleId: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            assetWei: 1n,
            alreadyExistsOnChain: false,
          },
        ],
        network: 'testnet',
        publicClient,
        walletClient,
        walletAddress: '0x1111111111111111111111111111111111111111',
      }),
    /reverted on-chain/i,
  );
});
