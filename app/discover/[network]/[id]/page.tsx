import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app/app-shell';
import { CollectionDetail } from '@/components/discover/collection-detail';
import { isGraphTermId } from '@/lib/intuition/graph-detail-route';
import type { PublicIntuitionNetwork } from '@/types/api';

export const metadata: Metadata = {
  title: 'Collection',
  description: 'Explore verified members of a Collate community list.',
};

export default function Page({ params }: { params: { network: string; id: string } }) {
  if ((params.network !== 'mainnet' && params.network !== 'testnet') || !isGraphTermId(params.id)) notFound();
  return (
    <AppShell>
      <CollectionDetail network={params.network as PublicIntuitionNetwork} id={params.id.toLowerCase()} />
    </AppShell>
  );
}
