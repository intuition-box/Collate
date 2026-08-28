import { decodeFunctionData, isHex, type Hex } from 'viem';

import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { HAS_TAG_PREDICATE_TERM_ID } from '@/lib/intuition/tx-prepare';
import type { ActivityItemKind, ActivityOperation, ActivitySourceFlow } from '@/types/activity';

const ATOM_FLOWS = new Set<ActivitySourceFlow>(['single_atom', 'batch_atoms', 'csv_atoms', 'inline_atom']);
const LIST_FLOWS = new Set<ActivitySourceFlow>(['manual_lists', 'csv_lists']);
const MAX_TRACKED_ITEMS = 250;

interface DecodedActivityBase {
  operation: ActivityOperation;
  itemKind: ActivityItemKind;
  itemCount: number;
}

export interface DecodedAtomActivity extends DecodedActivityBase {
  operation: 'createAtoms';
  itemKind: 'atom';
  atomDatas: readonly Hex[];
}

export interface DecodedTripleActivity extends DecodedActivityBase {
  operation: 'createTriples';
  itemKind: 'list_entry';
  subjectIds: readonly Hex[];
  predicateIds: readonly Hex[];
  objectIds: readonly Hex[];
}

export type DecodedActivityCalldata = DecodedAtomActivity | DecodedTripleActivity;

function assertItemCount(count: number) {
  if (count < 1 || count > MAX_TRACKED_ITEMS) {
    throw new Error(`Tracked writes must contain between 1 and ${MAX_TRACKED_ITEMS} items.`);
  }
}

export function decodeActivityCalldata(data: Hex, sourceFlow: ActivitySourceFlow): DecodedActivityCalldata {
  if (!isHex(data) || data.length < 10) {
    throw new Error('Transaction calldata is invalid.');
  }

  const decoded = decodeFunctionData({ abi: MULTIVAULT_ABI, data });

  if (decoded.functionName === 'createAtoms') {
    if (!ATOM_FLOWS.has(sourceFlow)) {
      throw new Error('This activity flow cannot submit createAtoms calldata.');
    }

    const [atomDatas, assets] = decoded.args;
    assertItemCount(atomDatas.length);

    if (atomDatas.length !== assets.length) {
      throw new Error('Atom data and asset counts do not match.');
    }

    return {
      operation: 'createAtoms',
      itemKind: 'atom',
      itemCount: atomDatas.length,
      atomDatas,
    };
  }

  if (decoded.functionName === 'createTriples') {
    if (!LIST_FLOWS.has(sourceFlow)) {
      throw new Error('This activity flow cannot submit createTriples calldata.');
    }

    const [subjectIds, predicateIds, objectIds, assets] = decoded.args;
    assertItemCount(subjectIds.length);

    if (
      subjectIds.length !== predicateIds.length ||
      subjectIds.length !== objectIds.length ||
      subjectIds.length !== assets.length
    ) {
      throw new Error('Triple input counts do not match.');
    }

    if (predicateIds.some((predicateId) => predicateId.toLowerCase() !== HAS_TAG_PREDICATE_TERM_ID.toLowerCase())) {
      throw new Error('List activity must use the expected list-entry predicate.');
    }

    return {
      operation: 'createTriples',
      itemKind: 'list_entry',
      itemCount: subjectIds.length,
      subjectIds,
      predicateIds,
      objectIds,
    };
  }

  throw new Error('Only atom and list creation writes can be tracked.');
}
