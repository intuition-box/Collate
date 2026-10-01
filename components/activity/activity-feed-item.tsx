'use client';

import { useEffect, useState } from 'react';

import { WalletIdentity } from '@/components/wallet/wallet-identity';
import { getImagePreviewCandidates, resolveIntuitionImageUrl } from '@/lib/intuition/images';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import type { ActivityAtomDetails, ConfirmedActivityItem } from '@/types/activity';

function ActivityImage({ image, label, large = false }: { image: string | null; label: string; large?: boolean }) {
  const candidates = getImagePreviewCandidates(image);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [image]);

  const size = large ? 'h-16 w-16 rounded-2xl' : 'h-12 w-12 rounded-xl';
  if (candidateIndex >= candidates.length) {
    return (
      <span className={`flex shrink-0 items-center justify-center border border-line bg-paper/70 text-muted ${size}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-5 w-5">
          <path d="M4 5.5h16v13H4zM4 15l4.5-4.5 4 4 2.5-2.5 5 5M16.5 9h.01" />
        </svg>
      </span>
    );
  }

  return (
    <img
      src={candidates[candidateIndex]}
      alt={label}
      loading="lazy"
      onError={() => setCandidateIndex((index) => index + 1)}
      className={`shrink-0 border border-line bg-paper object-cover ${size}`}
    />
  );
}

function sourceHref(url: string | null): string | null {
  const resolved = resolveIntuitionImageUrl(url);
  if (!resolved) return null;
  try {
    const parsed = new URL(resolved);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function AtomDetails({ atom, role, missingReason = 'pending' }: { atom: ActivityAtomDetails | null; role?: string; missingReason?: 'pending' | 'unavailable' }) {
  if (!atom) {
    return (
      <div className="min-w-0 rounded-xl border border-dashed border-line px-4 py-4 text-sm text-muted">
        {role ? `${role}: ` : null}{unavailableCopy(missingReason)}
      </div>
    );
  }

  const href = sourceHref(atom.url);
  return (
    <div className="min-w-0 rounded-xl border border-line/80 bg-white/55 p-4">
      {role ? <p className="mb-3 text-[0.65rem] uppercase tracking-terminal text-muted">{role}</p> : null}
      <div className="flex min-w-0 items-start gap-3">
        <ActivityImage image={atom.image} label={`${atom.label} image`} large />
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-ink">{atom.label}</p>
          {atom.type ? <p className="mt-1 text-xs text-muted">{atom.type}</p> : null}
        </div>
      </div>
      {atom.description ? <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{atom.description}</p> : null}
      {href ? (
        <div className="mt-4 min-w-0">
          <p className="text-[0.65rem] uppercase tracking-terminal text-muted">Source</p>
          <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            {atom.url}
          </a>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function unavailableCopy(state: 'pending' | 'unavailable') {
  return state === 'pending' ? 'Details are becoming available.' : 'Details unavailable right now.';
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
  if (display.state === 'pending' || display.state === 'unavailable') return unavailableCopy(display.state);
  if (display.atom) return display.atom.description ?? display.atom.type ?? 'Atom created on Intuition.';
  if (!display.triple) return 'Claim details are becoming available.';
  if (display.state === 'partial') return unavailableCopy(display.reason ?? 'pending');
  return item.kind === 'list_entry'
    ? display.triple.subject?.description ?? 'A member was added to this list.'
    : 'A new connection on the knowledge graph.';
}

export function ActivityFeedItem({ item, expanded, onToggle }: { item: ConfirmedActivityItem; expanded: boolean; onToggle: () => void }) {
  const networkConfig = getIntuitionNetwork(item.network);
  const title = titleFor(item);
  const display = item.display;
  const thumbnail = display.state === 'ready' || display.state === 'partial'
    ? display.atom?.image ?? display.triple?.subject?.image ?? display.triple?.object?.image ?? null
    : null;
  const detailsId = `activity-details-${item.id}`;

  return (
    <article className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <ActivityImage image={thumbnail} label={`${title} image`} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] uppercase tracking-terminal text-muted">
            <span>{item.kind === 'atom' ? 'Atom' : item.kind === 'list_entry' ? 'List member' : 'Claim'}</span>
            <span aria-hidden="true">·</span>
            <span>{item.network}</span>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={onToggle}
            className="group mt-1.5 flex w-full min-w-0 items-start justify-between gap-3 rounded-lg text-left text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <span className="min-w-0 break-words text-sm font-semibold leading-6 sm:text-base">
              {item.kind === 'list_entry' && display.triple ? (
                <>Added <strong>{display.triple.subject?.label ?? 'a member'}</strong> to <strong>{display.triple.object?.label ?? 'a list'}</strong></>
              ) : title}
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={`mt-1 h-5 w-5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </button>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted sm:line-clamp-1">{summaryFor(item)}</p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted">
            <span>by</span>
            <WalletIdentity address={item.creatorWallet} href={`${networkConfig.explorerUrl}/address/${item.creatorWallet}`} size={22} showAddress={false} />
            <span aria-hidden="true">·</span>
            <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
          </div>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId} className="mt-5 min-w-0 border-t border-line/70 pt-5 sm:ml-16">
          {display.state === 'pending' || display.state === 'unavailable' ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-muted">{unavailableCopy(display.state)}</p>
          ) : display.atom ? (
            <AtomDetails atom={display.atom} />
          ) : display.triple ? (
            <>
              {display.state === 'partial' ? <p className="mb-4 text-sm text-muted">{unavailableCopy(display.reason ?? 'pending')}</p> : null}
              <div className="grid min-w-0 gap-3 md:grid-cols-3">
                <AtomDetails atom={display.triple.subject} role="Subject" missingReason={display.reason ?? 'pending'} />
                <AtomDetails atom={display.triple.predicate} role="Predicate" missingReason={display.reason ?? 'pending'} />
                <AtomDetails atom={display.triple.object} role={item.kind === 'list_entry' ? 'List' : 'Object'} missingReason={display.reason ?? 'pending'} />
              </div>
            </>
          ) : null}
          <a
            href={`${networkConfig.explorerUrl}/tx/${item.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-muted underline decoration-line underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View transaction <span aria-hidden="true">↗</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
