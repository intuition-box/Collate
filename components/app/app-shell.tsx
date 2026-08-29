'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { NetworkToggle } from '@/components/app/network-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { usePublicSettings } from '@/components/app/use-public-settings';
import { CollateLogo } from '@/components/brand/collate-logo';
import { WalletButton } from '@/components/wallet/wallet-button';

const CORE_NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/create', label: 'Create' },
  { href: '/docs', label: 'Docs' },
];

export function AppShell({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { data: publicSettings } = usePublicSettings();
  const showActivity = publicSettings?.settings.showActivityInNav === true;
  const navItems = showActivity ? [...CORE_NAV_ITEMS, { href: '/activity', label: 'Activity' }] : CORE_NAV_ITEMS;

  return (
    <div className="min-h-screen w-full overflow-x-clip pb-16 pt-8 sm:pt-10">
      <header
        className={`mx-auto grid w-full max-w-[92rem] min-w-0 items-center gap-4 px-5 sm:px-8 lg:grid-cols-[minmax(18rem,1fr)_auto_minmax(18rem,1fr)] ${
          isHome ? 'mb-0' : 'mb-10'
        }`}
      >
        <div className="min-w-0 justify-self-center lg:justify-self-start">
          <Link href="/" aria-label="Collate home" className="inline-flex items-center">
            <CollateLogo />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className={`inline-flex w-full min-w-0 max-w-full items-center gap-1 justify-self-center overflow-hidden rounded-full border border-line/90 bg-white/88 p-1.5 backdrop-blur transition-[width] ${
            showActivity ? 'sm:w-[22rem]' : 'sm:w-[17rem]'
          }`}
        >
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm transition-colors duration-150 sm:px-5 ${
                  isActive ? 'bg-accent font-medium text-black' : 'text-ink hover:bg-paper/70'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-full border border-line/85 bg-white/72 p-1.5 lg:w-auto lg:justify-self-end">
          <NetworkToggle compact />
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>
      {fullBleed ? children : <div className="mx-auto w-full max-w-[92rem] px-5 sm:px-8">{children}</div>}
    </div>
  );
}
