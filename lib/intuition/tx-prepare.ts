import { encodeFunctionData, stringToHex, type Hex } from 'viem';

import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { getHasTagPredicateTermId } from '@/lib/intuition/list-predicate';
import { assertCreationBatchSize } from '@/lib/intuition/write-limits';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { PreparedAtomDraft } from '@/types/atoms';
import type { PreparedListEntry } from '@/types/lists';

export interface PreparedWriteTransaction {
  data: Hex;
  value: bigint;
}

export function prepareCreateAtomsTransaction(atoms: PreparedAtomDraft[], limit?: number): PreparedWriteTransaction {
  assertCreationBatchSize(atoms.length, 'atoms', limit);
  const atomDatas = atoms.map((atom) => stringToHex(atom.dataString));
  const assets = atoms.map((atom) => atom.assetWei);
  const value = assets.reduce((total, asset) => total + asset, 0n);

  return {
    data: encodeFunctionData({
      abi: MULTIVAULT_ABI,
      functionName: 'createAtoms',
      args: [atomDatas, assets],
    }),
    value,
  };
}

export function prepareCreateTriplesTransaction(entries: PreparedListEntry[], network: PublicIntuitionNetwork, limit?: number): PreparedWriteTransaction {
  assertCreationBatchSize(entries.length, 'list entries', limit);
  const subjectIds = entries.map((entry) => entry.memberTermId);
  const predicateIds = entries.map(() => getHasTagPredicateTermId(network));
  const objectIds = entries.map((entry) => entry.listTermId);
  const assets = entries.map((entry) => entry.assetWei);
  const value = assets.reduce((total, asset) => total + asset, 0n);

  return {
    data: encodeFunctionData({
      abi: MULTIVAULT_ABI,
      functionName: 'createTriples',
      args: [subjectIds, predicateIds, objectIds, assets],
    }),
    value,
  };
}
