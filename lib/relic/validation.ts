import { getAddress, isAddress, type Address } from 'viem';

import { RELIC_LOOKUP_LIMIT } from '@/lib/relic/shared';

export function parseRelicAddresses(input: unknown): Address[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > RELIC_LOOKUP_LIMIT) {
    throw new Error(`Provide 1 to ${RELIC_LOOKUP_LIMIT} valid wallet addresses.`);
  }

  const addresses = new Map<string, Address>();
  for (const value of input) {
    if (typeof value !== 'string' || !isAddress(value)) {
      throw new Error(`Provide 1 to ${RELIC_LOOKUP_LIMIT} valid wallet addresses.`);
    }
    const address = getAddress(value);
    addresses.set(address.toLowerCase(), address);
  }
  return [...addresses.values()];
}
