import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAddress, isAddress } from 'viem';

import { AppShell } from '@/components/app/app-shell';
import { ContributorPage } from '@/components/contributors/contributor-page';
import { parseContributorNetwork } from '@/lib/contributors/routes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contributor | Collate',
  description: 'See verified atoms, claims, and publishes created through Collate.',
};

export default function ContributorRoute({
  params,
  searchParams,
}: {
  params: { address: string };
  searchParams?: { network?: string | string[] };
}) {
  if (!isAddress(params.address)) notFound();
  const wallet = getAddress(params.address);
  const network = parseContributorNetwork(searchParams?.network);

  return (
    <AppShell>
      <ContributorPage key={`${wallet}-${network}`} wallet={wallet} network={network} />
    </AppShell>
  );
}
