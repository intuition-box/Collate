import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeFunctionData, type Hex } from 'viem';

import { MULTIVAULT_ABI } from '../../lib/intuition/abi';
import {
  HAS_TAG_PREDICATE_TERM_IDS,
  getHasTagPredicateTermId,
  isHasTagPredicateTermId,
} from '../../lib/intuition/list-predicate';
import { prepareCreateTriplesTransaction } from '../../lib/intuition/tx-prepare';

const TERM = `0x${'aa'.repeat(32)}` as Hex;
const entry = {
  id: 'entry-1',
  listTermId: TERM,
  memberTermId: TERM,
  tripleId: TERM,
  assetWei: 1n,
  alreadyExistsOnChain: false,
};

test('new list writes use the network-specific has tag predicate', () => {
  for (const network of ['mainnet', 'testnet'] as const) {
    const prepared = prepareCreateTriplesTransaction([entry], network);
    const decoded = decodeFunctionData({ abi: MULTIVAULT_ABI, data: prepared.data });
    if (decoded.functionName !== 'createTriples') assert.fail('Expected createTriples calldata.');

    assert.equal(decoded.args[1][0], getHasTagPredicateTermId(network));
    assert.equal(prepared.value, 1n);
  }
});

test('Testnet details recognize both current and legacy list predicates', () => {
  assert.equal(isHasTagPredicateTermId('testnet', HAS_TAG_PREDICATE_TERM_IDS.testnet), true);
  assert.equal(isHasTagPredicateTermId('testnet', HAS_TAG_PREDICATE_TERM_IDS.mainnet.toUpperCase()), true);
  assert.equal(isHasTagPredicateTermId('mainnet', HAS_TAG_PREDICATE_TERM_IDS.mainnet), true);
  assert.equal(isHasTagPredicateTermId('mainnet', HAS_TAG_PREDICATE_TERM_IDS.testnet), false);
  assert.equal(isHasTagPredicateTermId('testnet', null), false);
});
