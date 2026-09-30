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
  { href: '/', label: 'Home', shortLabel: 'Home' },
  { href: '/create', label: 'Create', shortLabel: 'Create' },
  { href: '/how-it-works', label: 'How it works', shortLabel: 'How' },
  { href: '/docs', label: 'Docs', shortLabel: 'Docs' },
];

export function AppShell({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { data: publicSettings } = usePublicSettings();
  const showActivity = publicSettings?.settings.showActivityInNav === true;
  const navItems = showActivity ? [...CORE_NAV_ITEMS, { href: '/activity', label: 'Activity', shortLabel: 'Activity' }] : CORE_NAV_ITEMS;

  return (
    <div className="min-h-screen w-full overflow-x-clip pb-16 pt-8 sm:pt-10">
      <header
        className={`mx-auto grid w-full max-w-[92rem] min-w-0 items-center gap-4 px-5 sm:px-8 xl:grid-cols-[minmax(18rem,1fr)_auto_minmax(18rem,1fr)] ${
          isHome ? 'mb-0' : 'mb-10'
        }`}
      >
        <div className="min-w-0 justify-self-center xl:justify-self-start">
          <Link href="/" aria-label="Collate home" className="inline-flex items-center">
            <CollateLogo />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className={`inline-flex w-full min-w-0 max-w-full items-center gap-0.5 justify-self-center overflow-hidden rounded-full border border-line/90 bg-white/88 p-1 backdrop-blur transition-[width] sm:gap-1 sm:p-1.5 ${
            showActivity ? 'sm:w-[34rem]' : 'sm:w-[28rem]'
          }`}
        >
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2 py-2 text-xs transition-colors duration-150 sm:px-4 sm:text-sm ${
                  isActive ? 'bg-accent font-medium text-black' : 'text-ink hover:bg-paper/70'
                }`}
              >
                <span className="min-[380px]:hidden">{item.shortLabel}</span>
                <span className="hidden min-[380px]:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-full border border-line/85 bg-white/72 p-1.5 xl:w-auto xl:justify-self-end">
          <NetworkToggle compact />
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>
      {fullBleed ? children : <div className="mx-auto w-full max-w-[92rem] px-5 sm:px-8">{children}</div>}
    </div>
  );
}
