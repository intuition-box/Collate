'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type DocSectionId =
  | 'introduction'
  | 'csv-formats'
  | 'review-states'
  | 'wallet-networks'
  | 'publishing'
  | 'known-follow-ups'
  | 'changelog';

type TocItem = {
  label: string;
  id: string;
};

const docsSections: Array<{ id: DocSectionId; label: string; icon: string }> = [
  { id: 'introduction', label: 'Introduction', icon: '01' },
  { id: 'csv-formats', label: 'CSV formats', icon: '02' },
  { id: 'review-states', label: 'Review states', icon: '03' },
  { id: 'wallet-networks', label: 'Wallet & networks', icon: '04' },
  { id: 'publishing', label: 'Publishing', icon: '05' },
  { id: 'known-follow-ups', label: 'Known follow-ups', icon: '06' },
];

const externalLinks = [
  { label: 'Status', href: 'https://stats.intuition.sh' },
  { label: 'Protocol Explorer', href: 'https://portal.intuition.systems' },
  { label: 'Website', href: 'https://intuition.systems' },
  { label: 'GitHub', href: 'https://github.com/giantcoconut/batch' },
];

const reviewStates = [
  ['ready_to_create', 'The row passed validation and is eligible for the next transaction.'],
  ['ready_with_matches', 'The row is eligible, but other exact-name atoms remain available to inspect or select.'],
  ['existing', 'The atom already exists and should not be minted again.'],
  ['skip_existing', 'The list entry already exists and will be skipped.'],
  ['blocked_duplicate', 'The same atom or list member appears more than once in the current batch.'],
  ['ambiguous', 'A CSV list row matched multiple candidate atoms and needs manual selection.'],
  ['missing', 'A CSV list member could not be resolved to an existing atom.'],
  ['invalid', 'Required data is missing or malformed, so the row is blocked.'],
];

const changelogItems = [
  {
    label: 'Core flows',
    title: 'All four batch workflows are live.',
    description: 'Manual atoms, CSV atoms, manual lists, and CSV lists now share review-first publishing behavior.',
  },
  {
    label: 'Safety model',
    title: 'Review states are first-class.',
    description: 'Rows are classified as ready, existing, skipped, duplicate, ambiguous, missing, or invalid before writes.',
  },
  {
    label: 'Media',
    title: 'Atom image handling was hardened.',
    description: 'CSV image previews, local image preparation, URL import, and metadata pinning fallbacks are in place.',
  },
  {
    label: 'Lists',
    title: 'List atom and member search got smoother.',
    description: 'List atom lookup now searches while typing, with inline atom creation paths for missing atoms.',
  },
  {
    label: 'Resolution',
    title: 'Duplicate-name list members stay reviewable.',
    description: 'Unique description matches remain publishable while exposing same-name graph atoms for comparison.',
  },
  {
    label: 'Interface',
    title: 'Navigation, docs, and themes were refreshed.',
    description: 'The app now has primary navigation, a docs-style page, and light/dark themes using Intuition-inspired colors.',
  },
];

const tocBySection: Record<DocSectionId, TocItem[]> = {
  introduction: [
    { label: 'Full docs coming soon', id: 'coming-soon' },
    { label: 'Introduction', id: 'introduction' },
    { label: 'Current flows', id: 'current-flows' },
  ],
  'csv-formats': [
    { label: 'CSV formats', id: 'csv-formats' },
    { label: 'Atom CSV headers', id: 'atom-csv-headers' },
    { label: 'List CSV headers', id: 'list-csv-headers' },
  ],
  'review-states': [
    { label: 'Review states', id: 'review-states' },
    { label: 'Status reference', id: 'status-reference' },
  ],
  'wallet-networks': [
    { label: 'Wallet & networks', id: 'wallet-networks' },
    { label: 'Operator requirements', id: 'operator-requirements' },
  ],
  publishing: [
    { label: 'Publishing', id: 'publishing' },
    { label: 'Submission rules', id: 'submission-rules' },
  ],
  'known-follow-ups': [
    { label: 'Known follow-ups', id: 'known-follow-ups' },
    { label: 'Planned improvements', id: 'planned-improvements' },
  ],
  changelog: [
    { label: 'Changelog', id: 'changelog' },
    { label: 'Shipped milestones', id: 'shipped-milestones' },
  ],
};

function ExternalArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div id={id} className="space-y-8">
      <div className="space-y-5">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{eyebrow}</p>
        <h1 className="font-serif text-5xl leading-[0.92] tracking-[-0.055em] sm:text-6xl">{title}</h1>
        <p className="max-w-3xl text-base leading-8 text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function DocsPageContent() {
  const [activeSection, setActiveSection] = useState<DocSectionId>('introduction');
  const activeDocsSection = docsSections.find((section) => section.id === activeSection);
  const activeTitle = activeDocsSection?.label ?? 'Changelog';
  const tocItems = useMemo(() => tocBySection[activeSection], [activeSection]);

  return (
    <section className="border-y border-line/80 bg-white/75">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/80 bg-white/80 px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink">Documentation</span>
          </div>

          <div className="hidden flex-wrap items-center gap-5 text-sm text-ink lg:flex">
            {externalLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-muted">
                {link.label}
                <ExternalArrow />
              </a>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
          <label className="relative w-full max-w-[16rem]">
            <span className="sr-only">Search docs</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              value=""
              readOnly
              placeholder="Search docs"
              title="Search is coming soon."
              className="w-full rounded-lg border border-line/80 bg-paper/70 py-2 pl-9 pr-3 text-sm text-muted outline-none"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
        <aside className="border-b border-line/80 bg-paper/55 p-4 sm:px-6 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            {docsSections.map((section) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                    isActive ? 'bg-white text-ink' : 'text-muted hover:bg-white/70 hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[0.68rem] text-muted">{section.icon}</span>
                    {section.label}
                  </span>
                  <span className="text-lg leading-none text-muted">&gt;</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Project updates</p>
            <button
              type="button"
              onClick={() => setActiveSection('changelog')}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors duration-150 ${
                activeSection === 'changelog'
                  ? 'border-accent/60 bg-accentSoft text-ink'
                  : 'border-accent/25 bg-accentSoft/35 text-ink hover:border-accent/50 hover:bg-accentSoft/60'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                <span className="text-sm font-medium">Changelog</span>
              </span>
              <span className="rounded-full border border-accent/40 bg-white/65 px-2 py-0.5 text-[0.62rem] uppercase tracking-terminal text-muted">
                Updates
              </span>
            </button>
          </div>

          <div className="mt-8 rounded-xl border border-line/80 bg-white/70 p-4">
            <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Operator preview</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              This page documents Collate's current tools while the fuller community docs are still being shaped.
            </p>
          </div>
        </aside>

        <article className="min-w-0 px-6 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span>&gt;</span>
            <span className="rounded-full bg-paper px-3 py-1 text-ink">Docs</span>
            <span>&gt;</span>
            <span className="rounded-full bg-paper px-3 py-1 text-ink">{activeTitle}</span>
          </div>

          {renderActiveSection(activeSection)}
        </article>

        <aside className="border-t border-line/80 bg-white/45 p-5 sm:px-6 lg:border-l lg:border-t-0">
          <div className="sticky top-6">
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">On this page</p>
            <div className="mt-4 space-y-3">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-sm leading-6 text-muted transition-colors duration-150 hover:text-ink"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function renderActiveSection(activeSection: DocSectionId) {
  if (activeSection === 'introduction') {
    return (
      <SectionShell
        id="introduction"
        eyebrow="Introduction"
        title="Review-first batch operations for Intuition."
        description="This standalone community tool helps operators create atoms and list entries in reviewed batches. Every flow is designed to preview, validate, classify, and filter rows before any irreversible protocol write is sent."
      >
        <section id="coming-soon" className="rounded-[1.2rem] border border-accent/40 bg-accentSoft/70 p-5">
          <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Full docs coming soon</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            This is a practical operator guide for the current app. A more sophisticated documentation system will come
            later with deeper examples, troubleshooting paths, and richer community testing notes.
          </p>
        </section>

        <section id="current-flows" className="grid gap-4 md:grid-cols-2">
          {['Manual atoms', 'CSV atoms', 'Manual lists', 'CSV lists'].map((flow) => (
            <div key={flow} className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{flow}</p>
              <p className="mt-3 text-sm leading-7 text-muted">Preview, review, and publish only eligible rows.</p>
            </div>
          ))}
        </section>
      </SectionShell>
    );
  }

  if (activeSection === 'csv-formats') {
    return (
      <SectionShell
        id="csv-formats"
        eyebrow="CSV formats"
        title="CSV imports start with preview, not publishing."
        description="CSV imports can be uploaded or pasted. Rows are parsed first, then reviewed against duplicate and existing-state checks before publishing."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <section id="atom-csv-headers" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5">
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Atom CSV headers</p>
            <p className="mt-3 font-mono text-sm leading-7 text-ink">
              name, description, url, image_url, deposit, schema_type, account_address, chain_id, raw_data
            </p>
          </section>
          <section id="list-csv-headers" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5">
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">List CSV headers</p>
            <p className="mt-3 font-mono text-sm leading-7 text-ink">member, name, atom, label, subject, description</p>
          </section>
        </div>
      </SectionShell>
    );
  }

  if (activeSection === 'review-states') {
    return (
      <SectionShell
        id="review-states"
        eyebrow="Review states"
        title="Every row explains what will happen."
        description="Review statuses make publish behavior explicit before users approve a transaction."
      >
        <section id="status-reference" className="divide-y divide-line/70 rounded-[1.1rem] border border-line/80 bg-white/60">
          {reviewStates.map(([state, description]) => (
            <div key={state} className="grid gap-2 px-5 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <code className="font-mono text-sm text-ink">{state}</code>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </div>
          ))}
        </section>
      </SectionShell>
    );
  }

  if (activeSection === 'wallet-networks') {
    return (
      <SectionShell
        id="wallet-networks"
        eyebrow="Wallet & networks"
        title="Connect to the target network before writes."
        description="The app can review rows without a wallet, but publishing requires a connected wallet on the selected Intuition network."
      >
        <section id="operator-requirements" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5">
          <ul className="list-disc space-y-3 pl-6 text-sm leading-7 text-muted">
            <li>Connect a wallet before publishing any eligible rows.</li>
            <li>Switch the wallet to the selected Intuition network before approving a write.</li>
            <li>WalletConnect is optional for local testing when injected wallets such as MetaMask or Rabby are available.</li>
          </ul>
        </section>
      </SectionShell>
    );
  }

  if (activeSection === 'publishing') {
    return (
      <SectionShell
        id="publishing"
        eyebrow="Publishing"
        title="Only eligible rows are submitted."
        description="Publishing is gated by review. Users must preview and review rows first, then approve a transaction containing only eligible entries."
      >
        <section id="submission-rules" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5">
          <p className="text-sm leading-7 text-muted">
            Existing, duplicate, ambiguous, missing, skipped, and invalid rows are never submitted. The review table stays
            visible so operators can see exactly what was created, skipped, or blocked.
          </p>
        </section>
      </SectionShell>
    );
  }

  if (activeSection === 'known-follow-ups') {
    return (
      <SectionShell
        id="known-follow-ups"
        eyebrow="Known follow-ups"
        title="Planned improvements after the current foundation."
        description="These are intentionally not treated as shipped capabilities yet."
      >
        <section id="planned-improvements" className="grid gap-4 md:grid-cols-3">
          {[
            'Richer docs plan with deeper examples and troubleshooting.',
            'Create missing member atoms directly from CSV list rows.',
            'Expanded deployment and community testing guidance.',
          ].map((item) => (
            <div key={item} className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5 text-sm leading-7 text-muted">
              {item}
            </div>
          ))}
        </section>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="changelog"
      eyebrow="Changelog"
      title="What has shipped so far."
      description="A concise public record of the capabilities and improvements currently available in the community tool."
    >
      <section id="shipped-milestones" className="divide-y divide-line/70 border-y border-line/80">
        {changelogItems.map((item) => (
          <div key={item.title} className="grid gap-3 py-5 md:grid-cols-[9rem_minmax(0,1fr)]">
            <p className="text-[0.68rem] uppercase tracking-terminal text-muted">{item.label}</p>
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-ink">{item.title}</h2>
              <p className="text-sm leading-7 text-muted">{item.description}</p>
            </div>
          </div>
        ))}
      </section>
    </SectionShell>
  );
}
