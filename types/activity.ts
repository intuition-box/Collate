import type { Hex } from 'viem';

import type { PublicIntuitionNetwork } from '@/types/api';

export const ACTIVITY_SOURCE_FLOWS = [
  'single_atom',
  'batch_atoms',
  'csv_atoms',
  'inline_atom',
  'manual_lists',
  'csv_lists',
] as const;

export type ActivitySourceFlow = (typeof ACTIVITY_SOURCE_FLOWS)[number];
export type ActivityItemKind = 'atom' | 'list_entry' | 'claim';
export type ActivityOperation = 'createAtoms' | 'createTriples';
export type ActivityTransactionStatus = 'intent' | 'pending' | 'confirmed' | 'reverted' | 'expired';

export interface ActivityIntentRequest {
  network: PublicIntuitionNetwork;
  sourceFlow: ActivitySourceFlow;
  walletAddress: Hex;
  data: Hex;
}

export interface ActivityIntentResponse {
  intentId: string;
  expiresAt: string;
}

export interface ActivityConfirmationRequest {
  intentId: string;
  network: PublicIntuitionNetwork;
  txHash: Hex;
}

export interface ActivityConfirmationResponse {
  status: ActivityTransactionStatus;
  itemCount: number;
  retryable: boolean;
}

export interface ActivityOutboxEntry extends ActivityConfirmationRequest {
  queuedAt: string;
}

export type ActivityNetworkFilter = PublicIntuitionNetwork | 'all';

export interface ActivityLeaderboardEntry {
  wallet: Hex;
  atoms: number;
  listEntries: number;
  claims: number;
  standaloneClaims: number;
  total: number;
}

export interface ActivitySummaryResponse {
  network: ActivityNetworkFilter;
  totals: {
    atoms: number;
    listEntries: number;
    claims: number;
    standaloneClaims: number;
    confirmedTransactions: number;
  };
  leaderboard: ActivityLeaderboardEntry[];
}

export interface ConfirmedActivityItem {
  id: string;
  kind: ActivityItemKind;
  network: PublicIntuitionNetwork;
  txHash: Hex;
  creatorWallet: Hex;
  protocolId: Hex;
  subjectId: Hex | null;
  predicateId: Hex | null;
  objectId: Hex | null;
  blockNumber: string;
  createdAt: string;
}

export interface ActivityItemsResponse {
  items: ConfirmedActivityItem[];
  nextCursor: string | null;
}
