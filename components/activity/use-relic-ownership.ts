'use client';

import { useQuery } from '@tanstack/react-query';

import { chunkActivityWallets } from '@/lib/relic/activity-wallets';
import { RELIC_LOOKUP_LIMIT, type RelicOwnership } from '@/lib/relic/shared';

interface RelicOwnershipResponse {
  holders: RelicOwnership;
}

async function fetchRelicOwnership(addresses: readonly string[], signal: AbortSignal): Promise<RelicOwnership> {
  const chunks = chunkActivityWallets(addresses, RELIC_LOOKUP_LIMIT);
  const results = await Promise.all(chunks.map(async (chunk) => {
    try {
      const response = await fetch('/api/relic/ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: chunk }),
        signal,
      });
      if (!response.ok) throw new Error('Relic ownership could not be loaded.');
      return (await response.json() as RelicOwnershipResponse).holders;
    } catch (error) {
      if (signal.aborted) throw error;
      return {};
    }
  }));
  return Object.assign({}, ...results) as RelicOwnership;
}

export function useRelicOwnership(addresses: readonly string[], enabled: boolean, refreshKey: number) {
  return useQuery({
    queryKey: ['relic-ownership', addresses, refreshKey],
    queryFn: ({ signal }) => fetchRelicOwnership(addresses, signal),
    enabled: enabled && addresses.length > 0,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
    retry: false,
  });
}
