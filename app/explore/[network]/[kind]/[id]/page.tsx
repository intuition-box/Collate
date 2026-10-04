import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app/app-shell';
import { GraphDetailPage } from '@/components/graph/graph-detail-page';
import { getGraphDetail } from '@/lib/intuition/graph-detail';
import { parseGraphDetailRoute } from '@/lib/intuition/graph-detail-route';

interface PageProps {
  params: { network: string; kind: string; id: string };
}

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: PageProps): Metadata {
  return {
    title: params.kind === 'atom' ? 'Atom details' : 'Triple details',
    description: 'Explore this Intuition knowledge graph creation on Collate.',
  };
}

export default async function ExploreDetailPage({ params }: PageProps) {
  const route = parseGraphDetailRoute(params);
  if (!route) notFound();

  const result = await getGraphDetail(route);
  return (
    <AppShell>
      <GraphDetailPage route={route} result={result} />
    </AppShell>
  );
}
