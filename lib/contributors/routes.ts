import type { ActivityNetworkFilter } from '@/types/activity';

export function parseContributorNetwork(value: string | string[] | null | undefined): ActivityNetworkFilter {
  return value === 'all' || value === 'testnet' ? value : 'mainnet';
}

export function getContributorHref(address: string, network: ActivityNetworkFilter): string {
  return `/contributors/${address}?network=${network}`;
}
