'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import type { Address } from 'viem';

import { ActivityPublishRow } from '@/components/activity/activity-publish-row';
import { useRelicOwnership } from '@/components/activity/use-relic-ownership';
import { RelicBadge } from '@/components/relic/relic-badge';
import { useEnsProfile } from '@/components/wallet/use-ens-profile';
import { WalletIdentityAvatar } from '@/components/wallet/wallet-identity-avatar';
import { getContributorHref } from '@/lib/contributors/routes';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { formatAddress } from '@/lib/utils/format';
import type { ActivityContributorSummaryResponse, ActivityNetworkFilter, ActivityPublishesResponse } from '@/types/activity';

const NETWORKS: Array<{ value: ActivityNetworkFilter; label: string }> = [
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'all', label: 'All networks' },
];

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Contributor activity could not be loaded.');
  return payload;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="min-w-0 border-t border-line/90 py-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-ink">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </div>
  );
}

export function ContributorPage({ wallet, network }: { wallet: Address; network: ActivityNetworkFilter }) {
  const { data: ens } = useEnsProfile(wallet);
  const { data: ownership } = useRelicOwnership([wallet], true, 0);
  const [openPublishId, setOpenPublishId] = useState<string | null>(null);
  const networkLabel = network === 'all' ? 'all networks' : getIntuitionNetwork(network).name;

  const summaryQuery = useQuery({
    queryKey: ['contributor-summary', wallet, network],
    queryFn: ({ signal }) => readJson<ActivityContributorSummaryResponse>(
      `/api/activity/contributors/${wallet}/summary?network=${network}`, signal,
    ),
    staleTime: 30_000,
    retry: 1,
  });
  const publishesQuery = useInfiniteQuery({
    queryKey: ['contributor-publishes', wallet, network],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ wallet, limit: '20' });
      if (network !== 'all') params.set('network', network);
      if (pageParam) params.set('cursor', pageParam);
      return readJson<ActivityPublishesResponse>(`/api/activity/publishes?${params}`, signal);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });

  const publishes = publishesQuery.data?.pages.flatMap((page) => page.publishes) ?? [];
  const isHolder = ownership?.[wallet.toLowerCase()] === true;
  const explorerNetworks = network === 'all' ? ['mainnet', 'testnet'] as const : [network];

  return (
    <main className="min-w-0 pb-12">
      <Link href="/activity" className="inline-flex rounded-sm text-sm text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Back to community activity</Link>

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-line/90 bg-white/72 px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <WalletIdentityAvatar address={wallet} ensImage={ens?.avatar} size={68} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">Contributor</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{ens?.name ?? formatAddress(wallet)}</h1>
              {isHolder ? <RelicBadge /> : null}
            </div>
            <p className="mt-2 max-w-full break-all font-mono text-xs text-muted">{wallet}</p>
            <p className="mt-4 text-sm text-muted">Atoms and claims this wallet created through Collate.</p>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-2 border-t border-line/80 pt-5">
          {explorerNetworks.map((option) => (
            <a key={option} href={`${getIntuitionNetwork(option).explorerUrl}/address/${wallet}`} target="_blank" rel="noreferrer" className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              {network === 'all' ? `${getIntuitionNetwork(option).name} explorer` : 'View on explorer'}
            </a>
          ))}
        </div>
      </section>

      <nav aria-label="Contributor network" className="mt-7 flex w-fit max-w-full flex-wrap gap-1 rounded-full border border-line bg-white/70 p-1">
        {NETWORKS.map((option) => (
          <Link key={option.value} href={getContributorHref(wallet, option.value)} aria-current={network === option.value ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${network === option.value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>{option.label}</Link>
        ))}
      </nav>

      <section aria-labelledby="contributor-totals" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="contributor-totals" className="text-2xl font-semibold tracking-tight text-ink">Created through Collate</h2>
          <p className="text-sm text-muted">Viewing {networkLabel}</p>
        </div>
        {summaryQuery.isPending ? <div className="mt-5 h-32 animate-pulse rounded-2xl bg-white/70" role="status" aria-label="Loading contributor totals" /> : null}
        {summaryQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-line bg-white/70 px-5 py-7 text-sm text-muted">
            <p>Contributor totals are unavailable right now.</p>
            <button type="button" onClick={() => void summaryQuery.refetch()} className="mt-3 rounded-full border border-line px-4 py-2 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button>
          </div>
        ) : null}
        {summaryQuery.data ? (
          <div className="mt-5 grid gap-x-7 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Atoms" value={summaryQuery.data.atoms} detail="Building blocks created" />
            <Metric label="Claims" value={summaryQuery.data.claims} detail="Including list entries" />
            <Metric label="List entries" value={summaryQuery.data.listEntries} detail="Included in claims" />
            <Metric label="Publishes" value={summaryQuery.data.publishes} detail="Confirmed sessions" />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="contributor-publishes" className="mt-11">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="contributor-publishes" className="text-2xl font-semibold tracking-tight text-ink">Recent publishes</h2>
          <p className="text-sm text-muted">Newest creations first</p>
        </div>
        {publishesQuery.isPending ? <div className="mt-5 h-48 animate-pulse rounded-2xl bg-white/70" role="status" aria-label="Loading recent publishes" /> : null}
        {publishesQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-line bg-white/70 px-5 py-8 text-sm text-muted">
            <p>Recent publishes are unavailable right now.</p>
            <button type="button" onClick={() => void publishesQuery.refetch()} className="mt-3 rounded-full border border-line px-4 py-2 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button>
          </div>
        ) : null}
        {publishesQuery.isSuccess && publishes.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-line bg-white/70 px-5 py-10 text-center">
            <p className="text-base font-medium text-ink">No Collate creations on {networkLabel} yet.</p>
            <p className="mt-2 text-sm text-muted">Try another network to see this wallet&apos;s contributions.</p>
          </div>
        ) : null}
        {publishes.length > 0 ? (
          <div className="mt-5 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line bg-white/70">
            {publishes.map((publish) => (
              <ActivityPublishRow key={publish.id} publish={publish} relicHolder={false} hideCreator expanded={openPublishId === publish.id} onToggle={() => setOpenPublishId((current) => current === publish.id ? null : publish.id)} />
            ))}
          </div>
        ) : null}
        {publishesQuery.hasNextPage ? (
          <div className="mt-5 text-center">
            <button type="button" onClick={() => void publishesQuery.fetchNextPage()} disabled={publishesQuery.isFetchingNextPage} className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{publishesQuery.isFetchingNextPage ? 'Loading...' : 'Load more publishes'}</button>
          </div>
        ) : null}
        {publishesQuery.isFetchNextPageError ? <p className="mt-3 text-center text-sm text-dangerInk">More publishes could not be loaded. Try again.</p> : null}
      </section>
    </main>
  );
}
