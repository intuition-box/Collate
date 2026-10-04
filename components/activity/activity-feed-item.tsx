'use client';

import Link from 'next/link';

import { GraphImage } from '@/components/graph/graph-image';
import { WalletIdentity } from '@/components/wallet/wallet-identity';
import { getGraphDetailHref } from '@/lib/intuition/graph-detail-route';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type { ConfirmedActivityItem } from '@/types/activity';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function titleFor(item: ConfirmedActivityItem): string {
  const display = item.display;
  if (display.state === 'pending' || display.state === 'unavailable') {
    return item.kind === 'atom' ? 'New atom' : item.kind === 'list_entry' ? 'New list member' : 'New claim';
  }
  if (display.atom) return display.atom.label;
  if (!display.triple) return 'New claim';
  if (item.kind === 'list_entry') {
    return `Added ${display.triple.subject?.label ?? 'a member'} to ${display.triple.object?.label ?? 'a list'}`;
  }
  return `${display.triple.subject?.label ?? 'Subject'} · ${display.triple.predicate?.label ?? 'Predicate'} · ${display.triple.object?.label ?? 'Object'}`;
}

function summaryFor(item: ConfirmedActivityItem): string {
  const display = item.display;
  if (display.state === 'pending') return 'Details are becoming available.';
  if (display.state === 'unavailable') return 'Details unavailable right now.';
  if (display.atom) return display.atom.description ?? display.atom.type ?? 'Atom created on Intuition.';
  if (!display.triple) return 'Claim details are becoming available.';
  if (display.state === 'partial') {
    return display.reason === 'unavailable' ? 'Some details are unavailable right now.' : 'Some details are becoming available.';
  }
  return item.kind === 'list_entry'
    ? display.triple.subject?.description ?? 'A member was added to this list.'
    : 'A new connection on the knowledge graph.';
}

export function ActivityFeedItem({ item }: { item: ConfirmedActivityItem }) {
  const networkConfig = getIntuitionNetwork(item.network);
  const title = titleFor(item);
  const summary = summaryFor(item);
  const display = item.display;
  const thumbnail = display.state === 'ready' || display.state === 'partial'
    ? display.atom?.image ?? display.triple?.subject?.image ?? display.triple?.object?.image ?? null
    : null;
  const detailHref = getGraphDetailHref(item.network, item.kind === 'atom' ? 'atom' : 'triple', item.protocolId);

  return (
    <article className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 transition-colors hover:bg-paper/40 sm:gap-4 sm:px-6 sm:py-2.5">
      <GraphImage image={thumbnail} label={`${title} image`} compact />

      <div className="min-w-0">
        <Link
          href={detailHref}
          className="block w-fit max-w-full truncate rounded-sm text-sm font-semibold leading-5 text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title={title}
        >
          {title}
        </Link>
        <p className="truncate text-xs leading-4 text-muted" title={summary}>{summary}</p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-4 text-muted">
          <span>{item.kind === 'atom' ? 'Atom' : item.kind === 'list_entry' ? 'List member' : 'Claim'}</span>
          <span aria-hidden="true">·</span>
          <span>{item.network === 'mainnet' ? 'Mainnet' : 'Testnet'}</span>
          <span aria-hidden="true">·</span>
          <span>by</span>
          <WalletIdentity
            address={item.creatorWallet}
            href={`${networkConfig.explorerUrl}/address/${item.creatorWallet}`}
            size={18}
            showAddress={false}
            className="max-w-[8rem] sm:max-w-[12rem]"
          />
          <span aria-hidden="true" className="md:hidden">·</span>
          <time dateTime={item.createdAt} title={formatDate(item.createdAt)} className="whitespace-nowrap md:hidden">{formatShortDate(item.createdAt)}</time>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <time dateTime={item.createdAt} className="hidden whitespace-nowrap text-xs text-muted md:block">
          {formatDate(item.createdAt)}
        </time>
        <a
          href={`${networkConfig.explorerUrl}/tx/${item.txHash}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`View transaction for ${title}`}
          title="View transaction"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path d="M8 5h7v7M15 5l-9 9M13 15H5V7" />
          </svg>
        </a>
        <Link
          href={detailHref}
          aria-label={`View details for ${title}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink/30 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
            <path d="M4 10h11M11 6l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
