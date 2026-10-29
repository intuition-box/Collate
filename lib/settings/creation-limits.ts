import { getAddress, isAddress } from 'viem';

import type { AdminAppSettings, CreationLimits } from '@/types/settings';

export const DEFAULT_ADMIN_SETTINGS: AdminAppSettings = {
  showActivityInNav: false,
  showDiscoverInNav: false,
  atomLimit: 50,
  listLimit: 50,
  privilegedLimit: 150,
  allowlistedWallets: [],
};

export function validateAdminSettings(value: unknown): AdminAppSettings {
  if (!value || typeof value !== 'object') throw new Error('Valid settings are required.');
  const settings = value as Partial<AdminAppSettings>;
  if (typeof settings.showActivityInNav !== 'boolean') throw new Error('Activity visibility must be enabled or disabled.');
  if (typeof settings.showDiscoverInNav !== 'boolean') throw new Error('Discover visibility must be enabled or disabled.');
  for (const [name, limit, maximum] of [
    ['Atom limit', settings.atomLimit, 100],
    ['List-entry limit', settings.listLimit, 100],
    ['Privileged limit', settings.privilegedLimit, 150],
  ] as const) {
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 2 || limit > maximum) {
      throw new Error(`${name} must be a whole number from 2 to ${maximum}.`);
    }
  }
  if (settings.privilegedLimit! < Math.max(settings.atomLimit!, settings.listLimit!)) {
    throw new Error('The privileged limit cannot be lower than the normal limits.');
  }
  if (!Array.isArray(settings.allowlistedWallets)) throw new Error('Wallet allowlist must be a list of addresses.');
  const wallets: string[] = [];
  const seen = new Set<string>();
  for (const wallet of settings.allowlistedWallets) {
    if (typeof wallet !== 'string' || !isAddress(wallet)) throw new Error('Enter valid Ethereum wallet addresses.');
    const normalized = getAddress(wallet);
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      wallets.push(normalized);
    }
  }
  return {
    showActivityInNav: settings.showActivityInNav,
    showDiscoverInNav: settings.showDiscoverInNav,
    atomLimit: settings.atomLimit!,
    listLimit: settings.listLimit!,
    privilegedLimit: settings.privilegedLimit!,
    allowlistedWallets: wallets,
  };
}

export function resolveCreationLimits(settings: AdminAppSettings, address?: string | null): CreationLimits {
  const privileged = !!address && isAddress(address) && settings.allowlistedWallets.some((wallet) => wallet.toLowerCase() === address.toLowerCase());
  return privileged
    ? { atomLimit: settings.privilegedLimit, listLimit: settings.privilegedLimit }
    : { atomLimit: settings.atomLimit, listLimit: settings.listLimit };
}
