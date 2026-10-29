import type { PublicAppSettings } from '@/types/settings';

export interface PrimaryNavItem {
  href: string;
  label: string;
  shortLabel: string;
}

const CORE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: '/', label: 'Home', shortLabel: 'Home' },
  { href: '/create', label: 'Create', shortLabel: 'Create' },
  { href: '/how-it-works', label: 'How it works', shortLabel: 'How' },
  { href: '/docs', label: 'Docs', shortLabel: 'Docs' },
];

export function getPrimaryNavItems(settings?: PublicAppSettings | null): PrimaryNavItem[] {
  return [
    ...CORE_NAV_ITEMS.slice(0, 2),
    ...(settings?.showDiscoverInNav ? [{ href: '/discover', label: 'Discover', shortLabel: 'Find' }] : []),
    ...CORE_NAV_ITEMS.slice(2),
    ...(settings?.showActivityInNav ? [{ href: '/activity', label: 'Activity', shortLabel: 'Feed' }] : []),
  ];
}
