import type { Hex } from 'viem';

import type { IntuitionAtomSearchResult } from '@/types/api';
import type { ReviewRow } from '@/types/review';

export type AtomSchemaType = 'Thing' | 'Person' | 'Organization' | 'Account' | 'Raw';

export interface AtomDraft {
  id: string;
  schemaType: AtomSchemaType;
  name: string;
  description: string;
  url: string;
  image: string;
  email: string;
  identifier: string;
  accountChainId: string;
  accountAddress: string;
  rawData: string;
  support: string;
}

export interface CsvAtomRow extends AtomDraft {
  sourceLine: number;
  sourceRecord: Record<string, string>;
}

export interface CsvAtomParseRow {
  atom: CsvAtomRow;
  errors: string[];
}

export interface PreparedAtomDraft {
  id: string;
  displayName: string;
  dataString: string;
  atomId: Hex;
  assetWei: bigint;
  supportWei: bigint;
  existsOnChain: boolean;
}

export interface AtomDuplicateInspection {
  draftId: string;
  duplicateKey: string;
  existingAtom: IntuitionAtomSearchResult | null;
  isDuplicateInBatch: boolean;
}

export interface AtomReviewPayload {
  draft: AtomDraft;
  prepared?: PreparedAtomDraft;
  errors?: string[];
}

export type AtomReviewRow = ReviewRow<AtomReviewPayload>;
export type ManualAtomReviewPayload = AtomReviewPayload;
export type ManualAtomReviewRow = AtomReviewRow;

export interface UnchainedCsvAtomRow {
  id: string;
  sourceLine: number;
  classification: string;
  values: Record<string, unknown>;
  deposit: string;
  sourceRecord: Record<string, string>;
}

export interface UnchainedCsvAtomParseRow {
  atom: UnchainedCsvAtomRow;
  errors: string[];
}

export interface UnchainedCsvAtomReviewPayload {
  draft: UnchainedCsvAtomRow;
  prepared?: PreparedAtomDraft;
  matches?: IntuitionAtomSearchResult[];
  errors?: string[];
}

export type UnchainedCsvAtomReviewRow = ReviewRow<UnchainedCsvAtomReviewPayload>;
