import assert from 'node:assert/strict';
import test from 'node:test';

import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  type Address,
  type Hex,
  type Log,
} from 'viem';

import { decodeActivityCalldata } from '../../lib/activity/calldata';
import { parseCreatedActivityItems, verifyCreatedActivityItems } from '../../lib/activity/events';
import { MULTIVAULT_ABI } from '../../lib/intuition/abi';
import { HAS_TAG_PREDICATE_TERM_ID } from '../../lib/intuition/tx-prepare';

const MULTIVAULT = '0x1111111111111111111111111111111111111111' as Address;
const CREATOR = '0x2222222222222222222222222222222222222222' as Address;
const ATOM_WALLET = '0x3333333333333333333333333333333333333333' as Address;
const TERM_A = `0x${'aa'.repeat(32)}` as Hex;
const TERM_B = `0x${'bb'.repeat(32)}` as Hex;
const TERM_C = `0x${'cc'.repeat(32)}` as Hex;

function atomLog(termId: Hex, atomData: Hex, address = MULTIVAULT): Log {
  return {
    address,
    topics: encodeEventTopics({
      abi: MULTIVAULT_ABI,
      eventName: 'AtomCreated',
      args: { creator: CREATOR, termId },
    }),
    data: encodeAbiParameters(
      [
        { name: 'atomData', type: 'bytes' },
        { name: 'atomWallet', type: 'address' },
      ],
      [atomData, ATOM_WALLET],
    ),
  } as Log;
}

function tripleLog(termId: Hex, subjectId: Hex, predicateId: Hex, objectId: Hex): Log {
  return {
    address: MULTIVAULT,
    topics: encodeEventTopics({
      abi: MULTIVAULT_ABI,
      eventName: 'TripleCreated',
      args: { creator: CREATOR, termId },
    }),
    data: encodeAbiParameters(
      [
        { name: 'subjectId', type: 'bytes32' },
        { name: 'predicateId', type: 'bytes32' },
        { name: 'objectId', type: 'bytes32' },
      ],
      [subjectId, predicateId, objectId],
    ),
  } as Log;
}

test('atom flows decode as atom activity and reject list flow labels', () => {
  const atomDatas = ['0x1234', '0xabcd'] as const;
  const data = encodeFunctionData({
    abi: MULTIVAULT_ABI,
    functionName: 'createAtoms',
    args: [atomDatas, [1n, 2n]],
  });

  const decoded = decodeActivityCalldata(data, 'batch_atoms');
  assert.equal(decoded.itemKind, 'atom');
  assert.equal(decoded.itemCount, 2);
  assert.deepEqual(decoded.atomDatas, atomDatas);
  assert.throws(() => decodeActivityCalldata(data, 'manual_lists'), /cannot submit createAtoms/);
});

test('list flows require the list-entry predicate and stay separate from claims', () => {
  const data = encodeFunctionData({
    abi: MULTIVAULT_ABI,
    functionName: 'createTriples',
    args: [[TERM_A], [HAS_TAG_PREDICATE_TERM_ID], [TERM_B], [1n]],
  });
  const decoded = decodeActivityCalldata(data, 'csv_lists');

  assert.equal(decoded.itemKind, 'list_entry');
  assert.equal(decoded.operation, 'createTriples');

  const unrelatedPredicateData = encodeFunctionData({
    abi: MULTIVAULT_ABI,
    functionName: 'createTriples',
    args: [[TERM_A], [TERM_C], [TERM_B], [1n]],
  });
  assert.throws(() => decodeActivityCalldata(unrelatedPredicateData, 'csv_lists'), /list-entry predicate/);
});

test('confirmed atom items come only from matching MultiVault creation events', () => {
  const atomData = '0x1234' as Hex;
  const decoded = decodeActivityCalldata(
    encodeFunctionData({
      abi: MULTIVAULT_ABI,
      functionName: 'createAtoms',
      args: [[atomData], [1n]],
    }),
    'single_atom',
  );
  const ignoredAddress = '0x4444444444444444444444444444444444444444' as Address;
  const items = parseCreatedActivityItems({
    logs: [atomLog(TERM_B, atomData, ignoredAddress), atomLog(TERM_A, atomData)],
    multiVault: MULTIVAULT,
    itemKind: 'atom',
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.protocolId, TERM_A);
  assert.equal(items[0]?.creatorWallet, CREATOR);
  assert.doesNotThrow(() => verifyCreatedActivityItems(items, decoded));
});

test('event verification rejects mismatched or incomplete confirmed payloads', () => {
  const decoded = decodeActivityCalldata(
    encodeFunctionData({
      abi: MULTIVAULT_ABI,
      functionName: 'createTriples',
      args: [[TERM_A], [HAS_TAG_PREDICATE_TERM_ID], [TERM_B], [1n]],
    }),
    'manual_lists',
  );
  const matchingItems = parseCreatedActivityItems({
    logs: [tripleLog(TERM_C, TERM_A, HAS_TAG_PREDICATE_TERM_ID, TERM_B)],
    multiVault: MULTIVAULT,
    itemKind: 'list_entry',
  });

  assert.doesNotThrow(() => verifyCreatedActivityItems(matchingItems, decoded));
  assert.throws(() => verifyCreatedActivityItems([], decoded), /Expected 1 creation events/);

  const wrongItems = parseCreatedActivityItems({
    logs: [tripleLog(TERM_C, TERM_B, HAS_TAG_PREDICATE_TERM_ID, TERM_A)],
    multiVault: MULTIVAULT,
    itemKind: 'list_entry',
  });
  assert.throws(() => verifyCreatedActivityItems(wrongItems, decoded), /did not match/);
});
