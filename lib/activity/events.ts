import { getAddress, parseEventLogs, type Address, type Hex, type Log } from 'viem';

import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import type { DecodedActivityCalldata } from '@/lib/activity/calldata';
import type { ActivityItemKind } from '@/types/activity';

export interface VerifiedActivityItem {
  itemIndex: number;
  itemKind: ActivityItemKind;
  protocolId: Hex;
  creatorWallet: Address;
  atomData: Hex | null;
  subjectId: Hex | null;
  predicateId: Hex | null;
  objectId: Hex | null;
}

export function parseCreatedActivityItems({
  logs,
  multiVault,
  itemKind,
}: {
  logs: Log[];
  multiVault: Address;
  itemKind: 'atom' | 'list_entry';
}): VerifiedActivityItem[] {
  const contractLogs = logs.filter((log) => log.address.toLowerCase() === multiVault.toLowerCase());

  if (itemKind === 'atom') {
    return parseEventLogs({
      abi: MULTIVAULT_ABI,
      logs: contractLogs,
      eventName: 'AtomCreated',
      strict: true,
    }).map((event, itemIndex) => ({
      itemIndex,
      itemKind: 'atom',
      protocolId: event.args.termId,
      creatorWallet: getAddress(event.args.creator),
      atomData: event.args.atomData,
      subjectId: null,
      predicateId: null,
      objectId: null,
    }));
  }

  return parseEventLogs({
    abi: MULTIVAULT_ABI,
    logs: contractLogs,
    eventName: 'TripleCreated',
    strict: true,
  }).map((event, itemIndex) => ({
    itemIndex,
    itemKind: 'list_entry',
    protocolId: event.args.termId,
    creatorWallet: getAddress(event.args.creator),
    atomData: null,
    subjectId: event.args.subjectId,
    predicateId: event.args.predicateId,
    objectId: event.args.objectId,
  }));
}

export function verifyCreatedActivityItems(items: VerifiedActivityItem[], decoded: DecodedActivityCalldata): void {
  if (items.length !== decoded.itemCount) {
    throw new Error(`Expected ${decoded.itemCount} creation events but found ${items.length}.`);
  }

  items.forEach((item, index) => {
    if (decoded.operation === 'createAtoms') {
      if (item.itemKind !== 'atom' || item.atomData?.toLowerCase() !== decoded.atomDatas[index]?.toLowerCase()) {
        throw new Error('Atom creation events did not match the submitted atom data.');
      }
      return;
    }

    if (
      item.itemKind !== 'list_entry' ||
      item.subjectId?.toLowerCase() !== decoded.subjectIds[index]?.toLowerCase() ||
      item.predicateId?.toLowerCase() !== decoded.predicateIds[index]?.toLowerCase() ||
      item.objectId?.toLowerCase() !== decoded.objectIds[index]?.toLowerCase()
    ) {
      throw new Error('Triple creation events did not match the submitted list entries.');
    }
  });
}
