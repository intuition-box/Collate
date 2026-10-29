'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';

import { useSelectedNetwork } from '@/components/app/network-provider';
import { DiscoverImage } from '@/components/discover/discover-image';
import { WalletIdentity } from '@/components/wallet/wallet-identity';
import { getContributorHref } from '@/lib/contributors/routes';
import { filterAndSortCollections, type CollectionSort } from '@/lib/discover/model';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type { DiscoverBatch, DiscoverBatchesResponse, DiscoverCollection, DiscoverCollectionsResponse } from '@/types/discover';

function networkName(network: 'mainnet' | 'testnet') {
  return network === 'mainnet' ? 'Mainnet' : 'Testnet';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Discover could not be loaded.');
  return payload;
}

function CollectionCard({ collection, lead = false, label }: { collection: DiscoverCollection; lead?: boolean; label?: string }) {
  const name = collection.name ?? (collection.metadataState === 'unavailable' ? 'List details unavailable' : 'List details pending');
  const href = `/discover/${collection.network}/${collection.id}`;
  return (
    <Link
      href={href}
      className={`group relative flex min-w-0 overflow-hidden rounded-2xl border border-line/90 bg-white/72 transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${lead ? 'min-h-[20rem] flex-col-reverse sm:flex-row' : 'min-h-[10rem] flex-row'}`}
    >
      <div className={`flex min-w-0 flex-1 flex-col justify-between ${lead ? 'gap-7 p-6 sm:p-8' : 'gap-4 p-4 sm:p-5'}`}>
        <div className="min-w-0">
          {label ? <p className="mb-4 text-xs font-medium uppercase tracking-terminal text-muted">{label}</p> : null}
          <h3 className={`text-balance font-semibold tracking-[-0.045em] text-ink ${lead ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>{name}</h3>
          <p className={`mt-2 text-pretty text-sm leading-6 text-muted ${lead ? 'max-w-md' : 'line-clamp-2'}`}>
            {collection.description ?? (collection.metadataState === 'unavailable' ? 'List details are temporarily unavailable. You can still explore its members.' : 'Explore the members added to this list.')}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xs text-muted">
          <span><strong className="block text-base font-semibold text-ink">{collection.memberCount.toLocaleString()}</strong>members</span>
          <span><strong className="block text-base font-semibold text-ink">{collection.contributorCount.toLocaleString()}</strong>contributors</span>
          <span className="sm:ml-auto">Updated {formatDate(collection.updatedAt)}</span>
        </div>
      </div>
      <DiscoverImage
        image={collection.image}
        label={`${name} cover`}
        className={lead ? 'h-44 w-full sm:h-auto sm:w-[45%]' : 'h-auto w-28 shrink-0 sm:w-36'}
      />
      <span className="pointer-events-none absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/85 text-ink transition-transform group-hover:translate-x-0.5 sm:top-4" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>
      </span>
    </Link>
  );
}

function BatchRow({ batch }: { batch: DiscoverBatch }) {
  const title = batch.atomCount > 0
    ? `${batch.atomCount} ${batch.atomCount === 1 ? 'atom' : 'atoms'} created`
    : `${batch.listEntryCount} list entries added`;
  const network = getIntuitionNetwork(batch.network);
  return (
    <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:px-6">
      <div className="col-start-1 row-start-1 min-w-0 sm:col-auto sm:row-auto">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">{batch.atomCount} atoms <span aria-hidden="true">&middot;</span> {batch.listEntryCount} list entries</p>
      </div>
      <WalletIdentity
        address={batch.creatorWallet}
        href={getContributorHref(batch.creatorWallet, batch.network)}
        size={24}
        showAddress={false}
        className="col-start-1 row-start-2 max-w-full sm:col-auto sm:row-auto"
      />
      <time dateTime={batch.createdAt} className="col-start-2 row-start-1 whitespace-nowrap text-right text-xs text-muted sm:col-auto sm:row-auto">{formatDateTime(batch.createdAt)}</time>
      <a
        href={`${network.explorerUrl}/tx/${batch.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="col-start-2 row-start-2 w-fit justify-self-end rounded-sm text-xs font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:col-auto sm:row-auto"
      >
        View transaction
      </a>
    </li>
  );
}

function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/25 bg-danger/5 px-6 py-8 text-center">
      <p className="text-sm text-ink">{message}</p>
      <button type="button" onClick={retry} className="mt-4 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button>
    </div>
  );
}

export function DiscoverPage() {
  const { network } = useSelectedNetwork();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CollectionSort>('recent');
  const deferredQuery = useDeferredValue(query);
  const collectionsQuery = useQuery({
    queryKey: ['discover-collections', network],
    queryFn: ({ signal }) => readJson<DiscoverCollectionsResponse>(`/api/discover/collections?network=${network}`, signal),
    staleTime: 30_000,
    retry: 1,
  });
  const batchesQuery = useQuery({
    queryKey: ['discover-batches', network],
    queryFn: ({ signal }) => readJson<DiscoverBatchesResponse>(`/api/discover/batches?network=${network}`, signal),
    staleTime: 30_000,
    retry: 1,
  });
  const collections = collectionsQuery.data?.collections ?? [];
  const visible = filterAndSortCollections(collections, deferredQuery, sort);
  const lead = visible[0];
  const side = visible.slice(1, 3);
  const rest = visible.slice(3);

  return (
    <main className="min-w-0 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line/80 pb-7">
        <div>
          <h1 className="text-5xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">Discover.</h1>
          <p className="mt-2 text-base text-muted">Find a list worth exploring on {networkName(network)}.</p>
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {collectionsQuery.data ? `${collections.length.toLocaleString()} ${collections.length === 1 ? 'collection' : 'collections'} on ${networkName(network)}` : `Browsing ${networkName(network)}`}
        </p>
      </header>

      <section aria-labelledby="collections-heading" className="mt-7">
        <div className="flex flex-col gap-3 rounded-2xl border border-line/85 bg-white/65 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block min-w-0 flex-1 sm:max-w-lg">
            <span className="sr-only">Search all {networkName(network)} collections</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all collections"
              className="w-full rounded-full border border-line bg-white px-11 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted" role="group" aria-label="Sort collections">
            <span className="mr-1">Sort by</span>
            <button type="button" aria-pressed={sort === 'recent'} onClick={() => setSort('recent')} className={`rounded-full border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${sort === 'recent' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-ink hover:border-ink/30'}`}>Recently updated</button>
            <button type="button" aria-pressed={sort === 'members'} onClick={() => setSort('members')} className={`rounded-full border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${sort === 'members' ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-ink hover:border-ink/30'}`}>Most members</button>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
          <h2 id="collections-heading" className="text-3xl font-semibold tracking-[-0.045em] text-ink">Explore collections</h2>
          {query && collectionsQuery.data ? <p className="text-xs text-muted" aria-live="polite">{visible.length} matches across all {networkName(network)} collections</p> : null}
        </div>

        {collectionsQuery.isPending ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-label="Loading collections">
            <div className="h-80 animate-pulse rounded-2xl border border-line bg-white/60" />
            <div className="grid gap-3"><div className="h-40 animate-pulse rounded-2xl border border-line bg-white/60" /><div className="h-40 animate-pulse rounded-2xl border border-line bg-white/60" /></div>
          </div>
        ) : collectionsQuery.isError ? (
          <div className="mt-5"><SectionError message="Collections could not be loaded right now." retry={() => void collectionsQuery.refetch()} /></div>
        ) : lead ? (
          <>
            <div className={`mt-5 grid gap-3 ${side.length > 0 ? 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : ''}`}>
              <CollectionCard collection={lead} lead label={sort === 'recent' ? 'Recently active' : 'Most members'} />
              {side.length > 0 ? <div className="grid gap-3">{side.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}</div> : null}
            </div>
            {rest.length > 0 ? <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rest.map((collection) => <CollectionCard key={collection.id} collection={collection} />)}</div> : null}
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-white/55 px-6 py-12 text-center">
            <p className="text-lg font-medium text-ink">{query ? 'No collections match that search.' : `No Collate lists on ${networkName(network)} yet.`}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {query ? 'Try another name or description. Search covers every collection shown on this network.' : 'Create or select a list atom, then add members to make it discoverable here.'}
            </p>
            {query ? <button type="button" onClick={() => setQuery('')} className="mt-5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink">Clear search</button>
              : <Link href="/create?flow=manual-lists" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">Start a list</Link>}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-batches-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="recent-batches-heading" className="text-3xl font-semibold tracking-[-0.045em] text-ink">Recent verified batches</h2>
            <p className="mt-2 text-sm text-muted">Multi-item publishes created through Collate on {networkName(network)}.</p>
          </div>
          <Link href="/activity" className="rounded-sm text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">View all activity</Link>
        </div>
        {batchesQuery.isPending ? <div className="mt-5 h-52 animate-pulse rounded-2xl border border-line bg-white/60" aria-label="Loading recent batches" />
          : batchesQuery.isError ? <div className="mt-5"><SectionError message="Recent batches could not be loaded right now." retry={() => void batchesQuery.refetch()} /></div>
            : batchesQuery.data.batches.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-line bg-white/55 px-6 py-8 text-sm text-muted">No multi-item publishes on {networkName(network)} yet.</div>
              : <ul className="mt-5 divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/90 bg-white/72">{batchesQuery.data.batches.map((batch) => <BatchRow key={batch.id} batch={batch} />)}</ul>}
      </section>
    </main>
  );
}
