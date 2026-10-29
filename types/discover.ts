import type { Address, Hex } from 'viem';

import type { PublicIntuitionNetwork } from '@/types/api';

export interface DiscoverCollection {
  id: Hex;
  network: PublicIntuitionNetwork;
  name: string | null;
  description: string | null;
  image: string | null;
  memberCount: number;
  contributorCount: number;
  updatedAt: string;
  metadataState: 'ready' | 'pending' | 'unavailable';
}

export interface DiscoverCollectionsResponse {
  network: PublicIntuitionNetwork;
  collections: DiscoverCollection[];
}

export interface DiscoverBatch {
  id: string;
  network: PublicIntuitionNetwork;
  txHash: Hex;
  creatorWallet: Address;
  atomCount: number;
  listEntryCount: number;
  createdAt: string;
}

export interface DiscoverBatchesResponse {
  network: PublicIntuitionNetwork;
  batches: DiscoverBatch[];
}

export interface DiscoverMember {
  id: string;
  atomId: Hex;
  creatorWallet: Address;
  addedAt: string;
  name: string | null;
  description: string | null;
  image: string | null;
  metadataState: 'ready' | 'pending' | 'unavailable';
}

export interface DiscoverCollectionDetailResponse {
  collection: DiscoverCollection;
  members: DiscoverMember[];
  nextCursor: string | null;
}
