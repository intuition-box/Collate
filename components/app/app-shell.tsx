'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { NetworkToggle } from '@/components/app/network-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { usePublicSettings } from '@/components/app/use-public-settings';
import { CollateLogo } from '@/components/brand/collate-logo';
import { WalletButton } from '@/components/wallet/wallet-button';
import { getPrimaryNavItems } from '@/lib/navigation/primary-nav';

export function AppShell({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { data: publicSettings } = usePublicSettings();
  const navItems = getPrimaryNavItems(publicSettings?.settings);
  const optionalNavCount = navItems.length - 4;

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip pt-8 sm:pt-10">
      <header
        className={`mx-auto grid w-full max-w-[92rem] min-w-0 items-center gap-4 px-5 sm:px-8 xl:grid-cols-[minmax(8rem,1fr)_auto_auto] ${
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
            optionalNavCount === 2 ? 'sm:w-[36rem]' : optionalNavCount === 1 ? 'sm:w-[34rem]' : 'sm:w-[28rem]'
          }`}
        >
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-1 py-2 text-xs transition-colors duration-150 sm:px-4 sm:text-sm ${
                  isActive ? 'bg-accent font-medium text-black' : 'text-ink hover:bg-paper/70'
                }`}
              >
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2 rounded-full border border-line/85 bg-white/72 p-1.5 xl:w-auto xl:flex-nowrap xl:justify-self-end">
          <NetworkToggle compact />
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>
      <div className={fullBleed ? 'w-full flex-1' : 'mx-auto w-full max-w-[92rem] flex-1 px-5 sm:px-8'}>{children}</div>
      <footer className="mt-16 w-full border-t border-line/70">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col items-start gap-4 px-5 py-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Collate is a community tool.</span>
          <div className="flex items-center gap-2">
            <span>Built on the</span>
            <a
              href="https://intuition.systems/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm font-medium text-ink underline-offset-4 transition-colors hover:text-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <Image src="/brand/intuition-logo-mark-on-ink.png" alt="" width={28} height={28} className="rounded-full" />
              <span>Intuition protocol</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
