import type { Metadata } from 'next';

import { AppShell } from '@/components/app/app-shell';
import { DiscoverPage } from '@/components/discover/discover-page';

export const metadata: Metadata = {
  title: 'Discover',
  description: 'Explore community lists and recent batches created through Collate.',
};

export default function Page() {
  return <AppShell><DiscoverPage /></AppShell>;
}
