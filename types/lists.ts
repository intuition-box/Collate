import type { Hex } from 'viem';

import type { IntuitionAtomSearchResult } from '@/types/api';
import type { ReviewRow } from '@/types/review';

export interface ListDraft {
  id: string;
  listAtom: IntuitionAtomSearchResult | null;
  mode: 'manual' | 'csv';
}

export interface ListMemberRow {
  id: string;
  sourceLine?: number;
  memberName: string;
  memberDescription: string;
  selectedAtom: IntuitionAtomSearchResult | null;
  candidates: IntuitionAtomSearchResult[];
  resolutionNote?: string;
}

export interface CsvListParseRow {
  row: ListMemberRow;
  errors: string[];
}

export interface PreparedListEntry {
  id: string;
  listTermId: Hex;
  memberTermId: Hex;
  tripleId: Hex;
  assetWei: bigint;
  alreadyExistsOnChain: boolean;
}

export interface ListReviewPayload {
  row: ListMemberRow;
  prepared?: PreparedListEntry;
  errors?: string[];
}

export type ManualListReviewRow = ReviewRow<ListReviewPayload>;
