import Link from 'next/link';

import { GraphImage } from '@/components/graph/graph-image';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import { HAS_TAG_PREDICATE_TERM_ID } from '@/lib/intuition/tx-prepare';
import type { GraphAtomComponent, GraphDetailResult } from '@/lib/intuition/graph-detail';
import { getGraphDetailHref, type GraphDetailRoute } from '@/lib/intuition/graph-detail-route';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

function sourceHref(value: string | null): string | null {
  const resolved = resolveIntuitionImageUrl(value);
  if (!resolved) return null;
  try {
    const url = new URL(resolved);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function SourceLink({ url }: { url: string | null }) {
  const href = sourceHref(url);
  if (!href || !url) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all rounded-sm text-sm text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {url}
    </a>
  );
}

function BackLink() {
  return (
    <Link href="/activity" className="inline-flex items-center gap-2 rounded-sm text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <span aria-hidden="true">←</span> Back to activity
    </Link>
  );
}

function ComponentCard({
  atom,
  role,
  network,
}: {
  atom: GraphAtomComponent | null;
  role: string;
  network: GraphDetailRoute['network'];
}) {
  if (!atom) {
    return (
      <article className="min-w-0 rounded-2xl border border-dashed border-line bg-white/45 p-5">
        <p className="text-xs uppercase tracking-terminal text-muted">{role}</p>
        <p className="mt-5 text-sm text-muted">Details are becoming available.</p>
      </article>
    );
  }

  return (
    <article className="min-w-0 rounded-2xl border border-line/90 bg-white/75 p-5 sm:p-6">
      <p className="text-xs uppercase tracking-terminal text-muted">{role}</p>
      <div className="mt-5 flex min-w-0 items-start gap-3">
        <GraphImage image={atom.image} label={`${atom.label} image`} />
        <div className="min-w-0">
          <Link
            href={getGraphDetailHref(network, 'atom', atom.termId)}
            className="break-words rounded-sm text-base font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {atom.label}
          </Link>
          {atom.type ? <p className="mt-1 text-xs text-muted">{atom.type}</p> : null}
        </div>
      </div>
      {atom.description ? <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-6 text-muted">{atom.description}</p> : null}
      {sourceHref(atom.url) ? (
        <div className="mt-5 border-t border-line/70 pt-4">
          <p className="mb-2 text-xs text-muted">Source</p>
          <SourceLink url={atom.url} />
        </div>
      ) : null}
    </article>
  );
}

export function GraphDetailPage({ route, result }: { route: GraphDetailRoute; result: GraphDetailResult }) {
  const networkLabel = route.network === 'mainnet' ? 'Mainnet' : 'Testnet';

  if (result.state !== 'ready') {
    return (
      <main className="mx-auto max-w-5xl pb-16">
        <BackLink />
        <section className="mt-8 rounded-2xl border border-line bg-white/75 px-6 py-12 sm:px-10">
          <p className="text-xs uppercase tracking-terminal text-muted">{networkLabel} {route.kind}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {result.state === 'pending' ? 'This detail is still becoming available.' : 'Graph details are unavailable right now.'}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
            {result.state === 'pending'
              ? 'If this was just created, the knowledge graph may still be indexing it. Check back shortly.'
              : 'The knowledge graph could not answer this request. Refresh the page in a moment.'}
          </p>
        </section>
      </main>
    );
  }

  const detail = result.detail;
  if (detail.kind === 'atom') {
    const createdAt = formatDate(detail.createdAt);
    return (
      <main className="mx-auto max-w-6xl pb-16">
        <BackLink />
        <article className="mt-8 min-w-0 rounded-2xl border border-line/90 bg-white/75 px-5 py-8 sm:px-10 sm:py-10">
          <p className="text-xs uppercase tracking-terminal text-muted">Atom · {networkLabel}</p>
          <div className="mt-8 flex min-w-0 flex-col items-start gap-6 sm:flex-row sm:gap-8">
            <GraphImage image={detail.atom.image} label={`${detail.atom.label} image`} large />
            <div className="min-w-0 flex-1">
              <h1 className="max-w-4xl break-words text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{detail.atom.label}</h1>
              {detail.atom.type ? <p className="mt-4 inline-flex rounded-full border border-line bg-paper/60 px-3 py-1 text-xs text-muted">{detail.atom.type}</p> : null}
              {detail.atom.description ? (
                <p className="mt-6 max-w-3xl whitespace-pre-wrap break-words text-base leading-7 text-muted">{detail.atom.description}</p>
              ) : (
                <p className="mt-6 text-sm text-muted">No description has been added to this atom.</p>
              )}
            </div>
          </div>
        </article>

        <section aria-label="Atom information" className="mt-6 grid min-w-0 gap-4 rounded-2xl border border-line/90 bg-white/65 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-xs text-muted">Network</p>
            <p className="mt-2 text-sm font-medium text-ink">Intuition {networkLabel}</p>
          </div>
          {createdAt ? <div><p className="text-xs text-muted">Created</p><p className="mt-2 text-sm font-medium text-ink">{createdAt}</p></div> : null}
          {detail.creatorLabel ? <div><p className="text-xs text-muted">Creator</p><p className="mt-2 break-words text-sm font-medium text-ink">{detail.creatorLabel}</p></div> : null}
          {sourceHref(detail.atom.url) ? <div className="min-w-0"><p className="mb-2 text-xs text-muted">Source</p><SourceLink url={detail.atom.url} /></div> : null}
        </section>
      </main>
    );
  }

  const isListEntry = detail.predicate?.termId.toLowerCase() === HAS_TAG_PREDICATE_TERM_ID.toLowerCase();
  const title = isListEntry
    ? `Added ${detail.subject?.label ?? 'a member'} to ${detail.object?.label ?? 'a list'}`
    : `${detail.subject?.label ?? 'Subject'} · ${detail.predicate?.label ?? 'Predicate'} · ${detail.object?.label ?? 'Object'}`;
  const createdAt = formatDate(detail.createdAt);

  return (
    <main className="mx-auto max-w-6xl pb-16">
      <BackLink />
      <section className="mt-8 min-w-0 rounded-2xl border border-line/90 bg-white/75 px-5 py-8 sm:px-10 sm:py-10">
        <p className="text-xs uppercase tracking-terminal text-muted">{isListEntry ? 'List entry' : 'Triple'} · {networkLabel}</p>
        <h1 className="mt-5 max-w-4xl break-words text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
          {isListEntry ? 'A member connected to a list on the knowledge graph.' : 'A relationship between three atoms on the knowledge graph.'}
        </p>
        {createdAt ? <p className="mt-6 text-xs text-muted">Created {createdAt}</p> : null}
      </section>

      <section aria-label="Triple atoms" className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">
        <ComponentCard atom={detail.subject} role={isListEntry ? 'Member atom' : 'Subject'} network={route.network} />
        <ComponentCard atom={detail.predicate} role="Predicate" network={route.network} />
        <ComponentCard atom={detail.object} role={isListEntry ? 'List atom' : 'Object'} network={route.network} />
      </section>
    </main>
  );
}
