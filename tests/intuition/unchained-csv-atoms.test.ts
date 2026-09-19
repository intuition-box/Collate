import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAtomId } from '@0xintuition/ids';
import { decodeFunctionData, hexToString, type PublicClient } from 'viem';

import { parseUnchainedAtomCsvText } from '@/lib/csv/unchained-atom-csv';
import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { prepareCreateAtomsTransaction } from '@/lib/intuition/tx-prepare';
import { getCreatableUnchainedAtoms, reviewUnchainedCsvAtoms } from '@/lib/intuition/unchained-csv-atoms';
import type { IntuitionAtomSearchResult } from '@/types/api';

function client(existingIds = new Set<string>()): PublicClient {
  return {
    readContract: async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
      if (functionName === 'getAtomCost') return 100n;
      if (functionName === 'calculateAtomId') return calculateAtomId(hexToString(args?.[0] as `0x${string}`));
      if (functionName === 'isTermCreated') return existingIds.has(String(args?.[0]).toLowerCase());
      throw new Error(`Unexpected read: ${functionName}`);
    },
  } as unknown as PublicClient;
}

function sameNameMatch(label: string): IntuitionAtomSearchResult {
  return {
    termId: `0x${'1'.repeat(64)}`,
    label,
    type: 'Thing',
    data: 'ipfs://older-atom',
    description: 'An older atom with the same name.',
    image: null,
    url: null,
    creatorId: null,
    creatorLabel: null,
    positionCount: 0,
    totalShares: '0',
  };
}

test('Unchained review blocks same-name legacy atoms until explicitly approved', async () => {
  const rows = parseUnchainedAtomCsvText('classification,name\nthing,Apple', 'thing').rows;
  const lookupMatches = async () => [sameNameMatch('Apple')];
  const first = await reviewUnchainedCsvAtoms({ rows, network: 'testnet', publicClient: client(), lookupMatches });

  assert.equal(first[0]?.status, 'ambiguous');
  assert.deepEqual(getCreatableUnchainedAtoms(first), []);

  const approved = await reviewUnchainedCsvAtoms({
    rows,
    network: 'testnet',
    publicClient: client(),
    lookupMatches,
    approvedMatchIds: new Set([rows[0]!.atom.id]),
  });

  assert.equal(approved[0]?.status, 'ready_to_create');
  assert.equal(getCreatableUnchainedAtoms(approved).length, 1);
});

test('exact existing IDs and duplicate batch rows never enter the publish payload', async () => {
  const rows = parseUnchainedAtomCsvText('classification,name\nthing,Apple\nthing,Apple', 'thing').rows;
  const duplicates = await reviewUnchainedCsvAtoms({
    rows,
    network: 'testnet',
    publicClient: client(),
    lookupMatches: async () => [],
  });

  assert.deepEqual(duplicates.map((row) => row.status), ['blocked_duplicate', 'blocked_duplicate']);
  assert.deepEqual(getCreatableUnchainedAtoms(duplicates), []);

  const atomId = duplicates[0]!.payload.prepared!.atomId.toLowerCase();
  const existing = await reviewUnchainedCsvAtoms({
    rows,
    network: 'testnet',
    publicClient: client(new Set([atomId])),
    lookupMatches: async () => [],
  });

  assert.deepEqual(existing.map((row) => row.status), ['existing', 'existing']);
  assert.deepEqual(getCreatableUnchainedAtoms(existing), []);
});

test('invalid canonical rows cannot become publishable', async () => {
  const rows = parseUnchainedAtomCsvText('classification,name,image_url\nthing,Apple,https://example.com/apple.png', 'thing').rows;
  const reviewed = await reviewUnchainedCsvAtoms({ rows, network: 'testnet', publicClient: client(), lookupMatches: async () => [] });

  assert.equal(reviewed[0]?.status, 'invalid');
  assert.deepEqual(getCreatableUnchainedAtoms(reviewed), []);
});

test('Unchained createAtoms calldata includes only reviewed eligible rows', async () => {
  const rows = parseUnchainedAtomCsvText('classification,name\nthing,Apple\nthing,Banana', 'thing').rows;
  const reviewed = await reviewUnchainedCsvAtoms({
    rows,
    network: 'testnet',
    publicClient: client(),
    lookupMatches: async (_network, name) => name === 'apple' ? [sameNameMatch('Apple')] : [],
  });
  const eligible = getCreatableUnchainedAtoms(reviewed);
  const transaction = prepareCreateAtomsTransaction(eligible);
  const decoded = decodeFunctionData({ abi: MULTIVAULT_ABI, data: transaction.data });

  assert.deepEqual(reviewed.map((row) => row.status), ['ambiguous', 'ready_to_create']);
  assert.equal(eligible.length, 1);
  assert.equal(decoded.functionName, 'createAtoms');
  assert.equal(decoded.args[0].length, 1);
  assert.equal(hexToString(decoded.args[0][0]!), eligible[0]?.dataString);
});
