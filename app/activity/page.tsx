import type { Metadata } from 'next';

import { ActivityDashboard } from '@/components/activity/activity-dashboard';
import { AppShell } from '@/components/app/app-shell';

export const metadata: Metadata = {
  title: 'Activity',
  description: 'Explore atoms, claims, and contributors creating with Collate.',
};

export const dynamic = 'force-dynamic';

export default function ActivityPage() {
  return (
    <AppShell>
      <ActivityDashboard />
    </AppShell>
  );
}
