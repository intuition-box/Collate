import { getAddress, parseAbi, type Address } from 'viem';

import { ethereumClient } from '@/lib/ethereum/client';
import { RELIC_CACHE_TTL_MS, type RelicOwnership } from '@/lib/relic/shared';

export const RELIC_CONTRACT = '0x7ab2f10cac6e27971fa93a5d5470bb84126bb734' as Address;
export { RELIC_CACHE_TTL_MS, RELIC_LOOKUP_LIMIT } from '@/lib/relic/shared';

const relicAbi = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

export type RelicBalanceReader = (addresses: readonly Address[]) => Promise<(bigint | null)[]>;

export async function readCurrentRelicBalances(addresses: readonly Address[]): Promise<(bigint | null)[]> {
  const results = await ethereumClient.multicall({
    contracts: addresses.map((address) => ({
      address: RELIC_CONTRACT,
      abi: relicAbi,
      functionName: 'balanceOf',
      args: [address],
    })),
    allowFailure: true,
  });

  return results.map((result) => result.status === 'success' && typeof result.result === 'bigint' ? result.result : null);
}

export function createRelicOwnershipLookup(
  readBalances: RelicBalanceReader,
  options: { now?: () => number; timeoutMs?: number; ttlMs?: number } = {},
) {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const ttlMs = options.ttlMs ?? RELIC_CACHE_TTL_MS;
  const cache = new Map<string, { owned: boolean; expiresAt: number }>();

  return async (addresses: readonly Address[]): Promise<RelicOwnership> => {
    const unique = [...new Map(addresses.map((address) => [address.toLowerCase(), getAddress(address)])).values()];
    const missing = unique.filter((address) => {
      const entry = cache.get(address.toLowerCase());
      return !entry || entry.expiresAt <= now();
    });
    const ownership: RelicOwnership = {};

    if (missing.length) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const balances = await Promise.race([
          readBalances(missing),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Relic ownership lookup timed out.')), timeoutMs);
          }),
        ]);
        missing.forEach((address, index) => {
          const balance = balances[index];
          if (balance === null || balance === undefined) {
            ownership[address.toLowerCase()] = null;
          } else {
            const owned = balance > 0n;
            cache.set(address.toLowerCase(), { owned, expiresAt: now() + ttlMs });
            ownership[address.toLowerCase()] = owned;
          }
        });
        if (cache.size > 5_000) {
          for (const [address, entry] of cache) {
            if (entry.expiresAt <= now()) cache.delete(address);
          }
          while (cache.size > 5_000) cache.delete(cache.keys().next().value!);
        }
      } catch (error) {
        console.error('[relic-ownership] Ethereum balance lookup failed.', error);
        missing.forEach((address) => { ownership[address.toLowerCase()] = null; });
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    unique.forEach((address) => {
      const key = address.toLowerCase();
      if (!(key in ownership)) ownership[key] = cache.get(key)?.owned ?? null;
    });
    return ownership;
  };
}

export const getRelicOwnership = createRelicOwnershipLookup(readCurrentRelicBalances);
