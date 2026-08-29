'use client';

import { startTransition, useEffect, useState } from 'react';

import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type {
  ActivityItemsResponse,
  ActivityNetworkFilter,
  ActivitySummaryResponse,
  ConfirmedActivityItem,
} from '@/types/activity';

const NETWORK_OPTIONS: Array<{ value: ActivityNetworkFilter; label: string }> = [
  { value: 'all', label: 'All networks' },
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
];

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function shortenHex(value: string, start = 6, end = 4) {
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getItemLabel(item: ConfirmedActivityItem) {
  if (item.kind === 'atom') return 'Atom';
  if (item.kind === 'list_entry') return 'List claim';
  return 'Claim';
}

function getRequestUrl(path: string, network: ActivityNetworkFilter, cursor?: string | null) {
  const params = new URLSearchParams();
  if (network !== 'all') params.set('network', network);
  if (path.endsWith('/items')) params.set('limit', '20');
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function readJson<ResponseType>(response: Response): Promise<ResponseType> {
  const payload = (await response.json()) as ResponseType & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Activity could not be loaded.');
  }

  return payload;
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="min-w-0 border-t border-line/90 py-5 sm:py-6">
      <p className="text-[0.65rem] uppercase tracking-terminal text-muted">{label}</p>
      <p className="mt-5 text-4xl font-semibold tracking-[-0.055em] text-ink sm:text-5xl">{NUMBER_FORMATTER.format(value)}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{detail}</p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-8" aria-label="Loading activity" aria-live="polite">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-[1.2rem] bg-white/65" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[1.5rem] bg-white/65" />
    </div>
  );
}

export function ActivityDashboard() {
  const [network, setNetwork] = useState<ActivityNetworkFilter>('all');
  const [summary, setSummary] = useState<ActivitySummaryResponse | null>(null);
  const [items, setItems] = useState<ConfirmedActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const [summaryResponse, itemsResponse] = await Promise.all([
          fetch(getRequestUrl('/api/activity/summary', network), { cache: 'no-store', signal: controller.signal }),
          fetch(getRequestUrl('/api/activity/items', network), { cache: 'no-store', signal: controller.signal }),
        ]);
        const [nextSummary, nextItems] = await Promise.all([
          readJson<ActivitySummaryResponse>(summaryResponse),
          readJson<ActivityItemsResponse>(itemsResponse),
        ]);

        setSummary(nextSummary);
        setItems(nextItems.items);
        setNextCursor(nextItems.nextCursor);
        setLastUpdated(new Date());
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
        setSummary(null);
        setItems([]);
        setNextCursor(null);
        setError(caughtError instanceof Error ? caughtError.message : 'Activity could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [network, refreshKey]);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await fetch(getRequestUrl('/api/activity/items', network, nextCursor), { cache: 'no-store' });
      const payload = await readJson<ActivityItemsResponse>(response);
      setItems((current) => [...current, ...payload.items]);
      setNextCursor(payload.nextCursor);
    } catch (caughtError) {
      setLoadMoreError(caughtError instanceof Error ? caughtError.message : 'More activity could not be loaded.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  const totalCreations = (summary?.totals.atoms ?? 0) + (summary?.totals.claims ?? 0);

  return (
    <main className="pb-12">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-line/80 bg-white/72 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-accent/35 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Community activity</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-ink sm:text-7xl">
              See what the community
              <span className="block font-serif font-normal italic">is creating.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              Explore the atoms, claims, and lists taking shape through Collate, and meet the contributors moving
              shared knowledge forward.
            </p>
          </div>

          <div className="lg:text-right">
            <p className="text-[0.65rem] uppercase tracking-terminal text-muted">Total creations</p>
            <p className="mt-2 text-6xl font-semibold tracking-[-0.07em] text-ink sm:text-7xl">
              {isLoading ? '—' : NUMBER_FORMATTER.format(totalCreations)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="tablist"
            aria-label="Activity network"
            className="inline-flex w-full items-center gap-1 rounded-full border border-line/90 bg-white/75 p-1 sm:w-auto"
          >
            {NETWORK_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={network === option.value}
                onClick={() => startTransition(() => setNetwork(option.value))}
                className={`min-w-0 flex-1 rounded-full px-4 py-2 text-xs transition-colors sm:flex-none sm:text-sm ${
                  network === option.value ? 'bg-ink font-medium text-paper' : 'text-muted hover:bg-paper/70 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p className="text-xs text-muted">
              {lastUpdated && !isLoading
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Latest community activity'}
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={isLoading}
              className="rounded-full border border-line bg-white/75 px-4 py-2 text-xs font-medium text-ink transition-colors hover:border-ink/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8">
            <LoadingState />
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[1.4rem] border border-danger/25 bg-danger/5 px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink">Activity is temporarily unavailable.</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper"
            >
              Try again
            </button>
          </div>
        ) : summary ? (
          <div className="mt-8 space-y-12">
            <div className="grid gap-x-7 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Atoms" value={summary.totals.atoms} detail="Building blocks created by the community." />
              <MetricCard label="Claims" value={summary.totals.claims} detail="Connections shared across the knowledge graph." />
              <MetricCard label="List entries" value={summary.totals.listEntries} detail="Members added across community lists." />
              <MetricCard
                label="Publishes"
                value={summary.totals.confirmedTransactions}
                detail="Creation sessions successfully published."
              />
            </div>

            <section aria-labelledby="leaderboard-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-terminal text-muted">Contributors</p>
                  <h2 id="leaderboard-heading" className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl">
                    Creation leaderboard
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-muted">Celebrating the people creating atoms and claims with Collate.</p>
              </div>

              {summary.leaderboard.length === 0 ? (
                <div className="mt-6 rounded-[1.4rem] border border-dashed border-line bg-white/45 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-ink">No creations here yet.</p>
                  <p className="mt-2 text-sm text-muted">The first contributor on this network will take the top spot.</p>
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-[1.4rem] border border-line/90 bg-white/72">
                  <table className="w-full min-w-[42rem] text-left">
                    <thead className="border-b border-line/80 text-[0.62rem] uppercase tracking-terminal text-muted">
                      <tr>
                        <th className="px-5 py-4 font-normal">Rank</th>
                        <th className="px-5 py-4 font-normal">Contributor</th>
                        <th className="px-5 py-4 text-right font-normal">Atoms</th>
                        <th className="px-5 py-4 text-right font-normal">Claims</th>
                        <th className="px-5 py-4 text-right font-normal">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/65">
                      {summary.leaderboard.map((entry, index) => {
                        const explorerNetwork = network === 'all' ? null : getIntuitionNetwork(network);
                        return (
                          <tr key={entry.wallet} className="transition-colors hover:bg-paper/45">
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                                  index === 0 ? 'bg-accent text-black' : 'border border-line bg-paper text-muted'
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-ink">
                              {explorerNetwork ? (
                                <a
                                  href={`${explorerNetwork.explorerUrl}/address/${entry.wallet}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline decoration-line underline-offset-4 hover:decoration-ink"
                                >
                                  {shortenHex(entry.wallet)}
                                </a>
                              ) : (
                                shortenHex(entry.wallet)
                              )}
                            </td>
                            <td className="px-5 py-4 text-right text-sm text-muted">{NUMBER_FORMATTER.format(entry.atoms)}</td>
                            <td className="px-5 py-4 text-right text-sm text-muted">{NUMBER_FORMATTER.format(entry.claims)}</td>
                            <td className="px-5 py-4 text-right text-sm font-semibold text-ink">{NUMBER_FORMATTER.format(entry.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section aria-labelledby="recent-activity-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-terminal text-muted">Latest from Collate</p>
                  <h2 id="recent-activity-heading" className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl">
                    Recent activity
                  </h2>
                </div>
                <p className="text-sm text-muted">Newest creations first.</p>
              </div>

              {items.length === 0 ? (
                <div className="mt-6 rounded-[1.4rem] border border-dashed border-line bg-white/45 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-ink">There is no activity in this view yet.</p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-line/90 bg-white/72">
                  <div className="divide-y divide-line/65">
                    {items.map((item) => {
                      const networkConfig = getIntuitionNetwork(item.network);
                      return (
                        <article
                          key={item.id}
                          className="grid gap-4 px-5 py-5 transition-colors hover:bg-paper/40 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.kind === 'atom' ? 'bg-accent' : 'bg-ink'}`} />
                            <div>
                              <p className="text-sm font-medium text-ink">{getItemLabel(item)}</p>
                              <p className="mt-1 text-[0.65rem] uppercase tracking-terminal text-muted">{item.network}</p>
                            </div>
                          </div>

                          <div className="min-w-0 sm:px-4">
                            <p className="truncate font-mono text-xs text-ink" title={item.protocolId}>
                              {shortenHex(item.protocolId, 10, 8)}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              by {shortenHex(item.creatorWallet)} · Block {NUMBER_FORMATTER.format(Number(item.blockNumber))}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <time dateTime={item.createdAt} className="text-xs text-muted">
                              {formatDate(item.createdAt)}
                            </time>
                            <a
                              href={`${networkConfig.explorerUrl}/tx/${item.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${getItemLabel(item).toLowerCase()} transaction in explorer`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink/30 hover:bg-paper"
                            >
                              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                                <path d="M8 5h7v7" />
                                <path d="m15 5-9 9" />
                              </svg>
                            </a>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {nextCursor ? (
                    <div className="border-t border-line/70 px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => void loadMore()}
                        disabled={isLoadingMore}
                        className="rounded-full border border-line bg-white/70 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 disabled:cursor-wait disabled:opacity-60"
                      >
                        {isLoadingMore ? 'Loading...' : 'Load more activity'}
                      </button>
                      {loadMoreError ? <p className="mt-3 text-xs text-danger">{loadMoreError}</p> : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
