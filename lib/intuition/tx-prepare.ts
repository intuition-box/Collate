import { encodeFunctionData, stringToHex, type Hex } from 'viem';

import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { assertCreationBatchSize } from '@/lib/intuition/write-limits';
import type { PreparedAtomDraft } from '@/types/atoms';
import type { PreparedListEntry } from '@/types/lists';

export interface PreparedWriteTransaction {
  data: Hex;
  value: bigint;
}

export function prepareCreateAtomsTransaction(atoms: PreparedAtomDraft[]): PreparedWriteTransaction {
  assertCreationBatchSize(atoms.length, 'atoms');
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

export function prepareCreateTriplesTransaction(entries: PreparedListEntry[]): PreparedWriteTransaction {
  assertCreationBatchSize(entries.length, 'list entries');
  const subjectIds = entries.map((entry) => entry.memberTermId);
  const predicateIds = entries.map(() => HAS_TAG_PREDICATE_TERM_ID);
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

export const HAS_TAG_PREDICATE_TERM_ID =
  '0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5' as Hex;
