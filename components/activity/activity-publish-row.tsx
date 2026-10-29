'use client';

import { useEffect, useRef, useState } from 'react';

import { ActivityFeedItem } from '@/components/activity/activity-feed-item';
import { GraphImage } from '@/components/graph/graph-image';
import { RelicBadge } from '@/components/relic/relic-badge';
import { WalletIdentity } from '@/components/wallet/wallet-identity';
import { getPublishPreview, getPublishTitle } from '@/lib/activity/publish-copy';
import { getContributorHref } from '@/lib/contributors/routes';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type { ActivityItemsResponse, ActivityPublish, ConfirmedActivityItem } from '@/types/activity';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function previewImage(publish: ActivityPublish): string | null {
  for (const item of publish.previewItems) {
    const display = item.display;
    if (display.state === 'ready' || display.state === 'partial') {
      const image = display.atom?.image ?? display.triple?.subject?.image ?? display.triple?.object?.image;
      if (image) return image;
    }
  }
  return null;
}

async function loadPublishItems(publishId: string, cursor: string | null, signal: AbortSignal): Promise<ActivityItemsResponse> {
  const params = new URLSearchParams({ limit: '25' });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/activity/publishes/${publishId}/items?${params}`, { cache: 'no-store', signal });
  const payload = await response.json() as ActivityItemsResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Publish items could not be loaded.');
  return payload;
}

export function ActivityPublishRow({
  publish,
  relicHolder,
  hideCreator = false,
  expanded,
  onToggle,
}: {
  publish: ActivityPublish;
  relicHolder: boolean;
  hideCreator?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [items, setItems] = useState<ConfirmedActivityItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const first = publish.previewItems[0];

  useEffect(() => {
    if (!expanded || items !== null) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void loadPublishItems(publish.id, null, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setItems(response.items);
        setNextCursor(response.nextCursor);
      })
      .catch((caughtError) => {
        if (!controller.signal.aborted) setError(caughtError instanceof Error ? caughtError.message : 'Publish items could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [expanded, items, publish.id, retryKey]);

  useEffect(() => () => loadMoreController.current?.abort(), []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await loadPublishItems(publish.id, nextCursor, controller.signal);
      if (controller.signal.aborted) return;
      setItems((current) => [...(current ?? []), ...response.items]);
      setNextCursor(response.nextCursor);
    } catch (caughtError) {
      if (!controller.signal.aborted) setError(caughtError instanceof Error ? caughtError.message : 'More items could not be loaded.');
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
      if (loadMoreController.current === controller) loadMoreController.current = null;
    }
  }

  if (publish.itemCount === 1 && first) return <ActivityFeedItem item={first} relicHolder={relicHolder} hideCreator={hideCreator} />;

  const title = getPublishTitle(publish);
  const networkConfig = getIntuitionNetwork(publish.network);
  const panelId = `publish-${publish.id}-items`;

  return (
    <article className="min-w-0">
      <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">
        <GraphImage image={previewImage(publish)} label={`${title} preview`} compact />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink" title={title}>{title}</h3>
          <p className="truncate text-xs text-muted" title={getPublishPreview(publish)}>{getPublishPreview(publish)}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
            <span>{publish.network === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
            {!hideCreator ? (
              <>
                <span aria-hidden="true">·</span>
                <span>by</span>
                <WalletIdentity
                  address={publish.creatorWallet}
                  href={getContributorHref(publish.creatorWallet, publish.network)}
                  size={18}
                  showAddress={false}
                  className="max-w-[8rem] sm:max-w-[12rem]"
                />
                {relicHolder ? <RelicBadge /> : null}
              </>
            ) : null}
            <span aria-hidden="true" className="md:hidden">·</span>
            <time dateTime={publish.createdAt} title={formatDate(publish.createdAt)} className="md:hidden">{formatShortDate(publish.createdAt)}</time>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <time dateTime={publish.createdAt} className="hidden whitespace-nowrap text-xs text-muted md:block">{formatDate(publish.createdAt)}</time>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? 'Hide' : 'View'} ${publish.itemCount} items in ${title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/70 text-xs font-medium text-ink transition-colors hover:border-ink/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
          >
            <span className="hidden sm:inline">{expanded ? 'Hide items' : `View ${publish.itemCount} items`}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <path d="m5 7 5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      <div id={panelId} hidden={!expanded} className="bg-paper/30">
        <div className="flex justify-end border-b border-line/65 px-4 py-2 sm:px-10">
          <a
            href={`${networkConfig.explorerUrl}/tx/${publish.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View transaction
          </a>
        </div>
        {loading ? <p className="px-4 py-5 text-sm text-muted sm:px-10" role="status">Loading items...</p> : null}
        {items?.length ? (
          <div className="divide-y divide-line/65">
            {items.map((item) => <ActivityFeedItem key={item.id} item={item} nested />)}
          </div>
        ) : null}
        {!loading && items?.length === 0 ? <p className="px-4 py-5 text-sm text-muted sm:px-10">Items are becoming available.</p> : null}
        {error ? (
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 text-sm sm:px-10">
            <p className="text-dangerInk">{error}</p>
            {items === null ? <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="rounded-full border border-line px-3 py-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button> : null}
          </div>
        ) : null}
        {nextCursor ? (
          <div className="px-4 py-4 text-center sm:px-10">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-full border border-line bg-white/70 px-4 py-2 text-xs font-medium text-ink hover:border-ink/30 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              {loadingMore ? 'Loading...' : 'Load more items'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
