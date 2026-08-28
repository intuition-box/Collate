import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { ActivityOutboxProvider } from '@/components/app/activity-outbox-provider';
import { ThemeProvider } from '@/components/app/theme-provider';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import './globals.css';

const geist = localFont({
  src: '../public/fonts/geist-variable.ttf',
  variable: '--font-geist',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
});

const geistMono = localFont({
  src: '../public/fonts/geist-mono-variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Collate',
    template: '%s | Collate',
  },
  description: 'Review-first community tools for creating atoms and lists on Intuition.',
  applicationName: 'Collate',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          <ActivityOutboxProvider>
            <WalletProvider>{children}</WalletProvider>
          </ActivityOutboxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
