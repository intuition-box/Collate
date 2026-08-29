import type { Metadata } from 'next';

import { AppShell } from '@/components/app/app-shell';
import { SettingsPanel } from '@/components/settings/settings-panel';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="py-4 sm:py-8">
        <SettingsPanel />
      </main>
    </AppShell>
  );
}
