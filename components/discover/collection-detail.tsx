'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSelectedNetwork } from '@/components/app/network-provider';
import { DiscoverImage } from '@/components/discover/discover-image';
import { GraphImage } from '@/components/graph/graph-image';
import { WalletIdentity } from '@/components/wallet/wallet-identity';
import { getContributorHref } from '@/lib/contributors/routes';
import { getGraphDetailHref } from '@/lib/intuition/graph-detail-route';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { DiscoverCollectionDetailResponse, DiscoverMember } from '@/types/discover';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function MemberRow({ member, network }: { member: DiscoverMember; network: PublicIntuitionNetwork }) {
  const name = member.name ?? (member.metadataState === 'unavailable' ? 'Atom details unavailable' : 'Atom details pending');
  return (
    <li className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-4 px-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
      <GraphImage image={member.image} label={`${name} image`} compact />
      <div className="min-w-0">
        <Link href={getGraphDetailHref(network, 'atom', member.atomId)} className="block w-fit max-w-full truncate rounded-sm text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{name}</Link>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{member.description ?? 'View this atom on the knowledge graph.'}</p>
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-14 text-xs text-muted sm:col-span-1 sm:pl-0">
        <WalletIdentity address={member.creatorWallet} href={getContributorHref(member.creatorWallet, network)} size={20} showAddress={false} className="max-w-36" />
        <time dateTime={member.addedAt}>{formatDate(member.addedAt)}</time>
        <Link href={getGraphDetailHref(network, 'atom', member.atomId)} aria-label={`View ${name}`} className="rounded-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">View atom</Link>
      </div>
    </li>
  );
}

export function CollectionDetail({ network, id }: { network: PublicIntuitionNetwork; id: string }) {
  const router = useRouter();
  const { network: selectedNetwork, setNetwork } = useSelectedNetwork();
  const [alignedRoute, setAlignedRoute] = useState<PublicIntuitionNetwork | null>(null);

  useEffect(() => {
    setNetwork(network);
  }, [network, setNetwork]);

  useEffect(() => {
    if (selectedNetwork === network) setAlignedRoute(network);
    else if (alignedRoute === network) router.push('/discover');
  }, [alignedRoute, selectedNetwork, network, router]);

  const result = useInfiniteQuery({
    queryKey: ['discover-collection', network, id],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<DiscoverCollectionDetailResponse> => {
      const params = new URLSearchParams({ limit: '24' });
      if (pageParam) params.set('cursor', pageParam);
      const response = await fetch(`/api/discover/collections/${network}/${id}?${params}`, { cache: 'no-store', signal });
      const payload = await response.json() as DiscoverCollectionDetailResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Collection could not be loaded.');
      return payload;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 1,
    staleTime: 30_000,
  });

  const collection = result.data?.pages[0]?.collection;
  const members = result.data?.pages.flatMap((page) => page.members) ?? [];
  const name = collection?.name ?? (collection?.metadataState === 'unavailable' ? 'List details unavailable' : 'List details pending');
  const networkLabel = network === 'mainnet' ? 'Mainnet' : 'Testnet';

  return (
    <main className="min-w-0 pb-12">
      <Link href="/discover" className="inline-flex items-center gap-2 rounded-sm text-sm text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M16 10H5m4-4-4 4 4 4" /></svg>
        Back to Discover
      </Link>
      {result.isPending ? (
        <div className="mt-7 space-y-5" aria-label="Loading collection">
          <div className="h-64 animate-pulse rounded-2xl border border-line bg-white/60" />
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-white/60" />
        </div>
      ) : result.isError ? (
        <div className="mt-7 rounded-2xl border border-danger/25 bg-danger/5 px-6 py-10 text-center">
          <h1 className="text-2xl font-semibold text-ink">Collection unavailable</h1>
          <p className="mt-2 text-sm text-muted">{result.error.message}</p>
          <button type="button" onClick={() => void result.refetch()} className="mt-5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink">Try again</button>
        </div>
      ) : collection ? (
        <>
          <header className="mt-7 overflow-hidden rounded-2xl border border-line/90 bg-white/72 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.38fr)]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-medium uppercase tracking-terminal text-muted">{networkLabel} collection</p>
              <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.055em] text-ink sm:text-5xl">{name}</h1>
              <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted">{collection.description ?? 'Explore the members added to this list through Collate.'}</p>
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-line/80 pt-5 text-xs text-muted">
                <span><strong className="block text-2xl font-semibold text-ink">{collection.memberCount.toLocaleString()}</strong>members</span>
                <span><strong className="block text-2xl font-semibold text-ink">{collection.contributorCount.toLocaleString()}</strong>contributors</span>
                <span className="self-end">Updated {formatDate(collection.updatedAt)}</span>
              </div>
            </div>
            <DiscoverImage image={collection.image} label={`${name} cover`} className="h-48 w-full sm:h-full" />
          </header>

          <section aria-labelledby="members-heading" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="members-heading" className="text-3xl font-semibold tracking-[-0.045em] text-ink">Members</h2>
                <p className="mt-2 text-sm text-muted">Atoms added to this list through Collate on {networkLabel}.</p>
              </div>
              <Link href={getGraphDetailHref(network, 'atom', collection.id)} className="rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">View list atom</Link>
            </div>
            <ul className="mt-5 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/90 bg-white/72">
              {members.map((member) => <MemberRow key={member.id} member={member} network={network} />)}
            </ul>
            {result.hasNextPage ? (
              <div className="mt-5 text-center">
                <button type="button" onClick={() => void result.fetchNextPage()} disabled={result.isFetchingNextPage} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  {result.isFetchingNextPage ? 'Loading members...' : 'Load more members'}
                </button>
              </div>
            ) : null}
            {result.isFetchNextPageError ? <p className="mt-3 text-center text-sm text-dangerInk">More members could not be loaded. Try again.</p> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
