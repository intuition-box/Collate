import type { Hex } from 'viem';

import type { WriteResult } from '@/types/writes';

export type PublishedItemKind = 'atom' | 'list_entry';

export type PublishFeedback = {
  title: string;
  count: number;
  txHash: Hex;
};

export function getPublishFeedback(result: WriteResult, kind: PublishedItemKind): PublishFeedback | null {
  if (result.kind !== 'created' || !result.txHash || result.createdIds.length === 0) return null;

  const count = result.createdIds.length;
  const title = kind === 'atom'
    ? `${count} ${count === 1 ? 'atom' : 'atoms'} created`
    : `${count} list ${count === 1 ? 'member' : 'members'} added`;

  return { title, count, txHash: result.txHash };
}
