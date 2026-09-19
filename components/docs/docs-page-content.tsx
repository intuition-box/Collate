'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type DocSectionId =
  | 'introduction'
  | 'single-atom-guide'
  | 'batch-atoms-guide'
  | 'csv-atoms-guide'
  | 'single-list-guide'
  | 'batch-lists-guide'
  | 'csv-lists-guide'
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

type DocsSection = { id: DocSectionId; label: string; icon: string };

const guideSections: DocsSection[] = [
  { id: 'single-atom-guide', label: 'Create one atom', icon: '01' },
  { id: 'batch-atoms-guide', label: 'Create batch atoms', icon: '02' },
  { id: 'csv-atoms-guide', label: 'Import atom CSV', icon: '03' },
  { id: 'single-list-guide', label: 'Add one list member', icon: '04' },
  { id: 'batch-lists-guide', label: 'Add batch list members', icon: '05' },
  { id: 'csv-lists-guide', label: 'Import list CSV', icon: '06' },
];

const referenceSections: DocsSection[] = [
  { id: 'introduction', label: 'Introduction', icon: 'A' },
  { id: 'csv-formats', label: 'CSV formats', icon: 'B' },
  { id: 'review-states', label: 'Review states', icon: 'C' },
  { id: 'wallet-networks', label: 'Wallet & networks', icon: 'D' },
  { id: 'publishing', label: 'Publishing', icon: 'E' },
  { id: 'known-follow-ups', label: 'Known follow-ups', icon: 'F' },
];

const docsSections = [...guideSections, ...referenceSections];

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
  'single-atom-guide': [
    { label: 'Before you start', id: 'single-atom-before' },
    { label: 'Step by step', id: 'single-atom-steps' },
    { label: 'What review means', id: 'single-atom-review' },
  ],
  'batch-atoms-guide': [
    { label: 'Before you start', id: 'batch-atoms-before' },
    { label: 'Step by step', id: 'batch-atoms-steps' },
    { label: 'What gets published', id: 'batch-atoms-publish' },
  ],
  'csv-atoms-guide': [
    { label: 'Choose a format', id: 'csv-atoms-format' },
    { label: 'Step by step', id: 'csv-atoms-steps' },
    { label: 'Review checklist', id: 'csv-atoms-review' },
  ],
  'single-list-guide': [
    { label: 'How lists work', id: 'single-list-before' },
    { label: 'Step by step', id: 'single-list-steps' },
    { label: 'Create missing atoms', id: 'single-list-create' },
  ],
  'batch-lists-guide': [
    { label: 'Before you start', id: 'batch-lists-before' },
    { label: 'Step by step', id: 'batch-lists-steps' },
    { label: 'What gets published', id: 'batch-lists-publish' },
  ],
  'csv-lists-guide': [
    { label: 'Choose the list atom', id: 'csv-lists-before' },
    { label: 'Build the CSV', id: 'csv-lists-format' },
    { label: 'Step by step', id: 'csv-lists-steps' },
    { label: 'Resolve row statuses', id: 'csv-lists-review' },
  ],
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

function DocsSectionList({
  label,
  sections,
  activeSection,
  onSelect,
}: {
  label: string;
  sections: DocsSection[];
  activeSection: DocSectionId;
  onSelect: (section: DocSectionId) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-3 pb-1 text-[0.68rem] uppercase tracking-terminal text-muted">{label}</p>
      {sections.map((section) => {
        const isActive = activeSection === section.id;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
              isActive ? 'bg-white text-ink' : 'text-muted hover:bg-white/70 hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="w-5 font-mono text-[0.68rem] text-muted">{section.icon}</span>
              {section.label}
            </span>
            <span className="text-lg leading-none text-muted">&gt;</span>
          </button>
        );
      })}
    </div>
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

function GuideChecklist({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section id={id} className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5 sm:p-6">
      <h2 className="text-xl font-medium tracking-[-0.025em] text-ink">{title}</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-muted">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function GuideSteps({
  id,
  steps,
}: {
  id: string;
  steps: Array<{ title: string; description: ReactNode }>;
}) {
  return (
    <section id={id} className="divide-y divide-line/70 border-y border-line/80">
      {steps.map((step, index) => (
        <div key={step.title} className="grid gap-4 py-6 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/55 bg-accentSoft font-mono text-xs text-ink">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <h2 className="text-lg font-medium text-ink">{step.title}</h2>
            <div className="mt-2 text-sm leading-7 text-muted">{step.description}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function GuideNote({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-[1.1rem] border border-accent/40 bg-accentSoft/65 p-5 sm:p-6">
      <p className="text-[0.68rem] uppercase tracking-terminal text-muted">{label}</p>
      <div className="mt-3 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}

function CsvExample({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-line/80 bg-white/75 p-4 font-mono text-xs leading-6 text-ink">
      <code>{children}</code>
    </pre>
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
          <div className="space-y-7">
            <DocsSectionList
              label="Creation guides"
              sections={guideSections}
              activeSection={activeSection}
              onSelect={setActiveSection}
            />
            <DocsSectionList
              label="Reference"
              sections={referenceSections}
              activeSection={activeSection}
              onSelect={setActiveSection}
            />
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
  if (activeSection === 'single-atom-guide') {
    return (
      <SectionShell
        id="single-atom-guide"
        eyebrow="Creation guide 01"
        title="Create one atom."
        description="The quickest path for creating a single building block while still checking the knowledge graph before you sign."
      >
        <GuideChecklist
          id="single-atom-before"
          title="Before you start"
          items={[
            'Choose Mainnet or Testnet from the network control at the top of the page.',
            'Have a compatible wallet ready and funded with the selected network’s native token.',
            'Decide whether the atom represents a Thing, Person, Organization, Account, or raw URI/data value.',
          ]}
        />
        <GuideSteps
          id="single-atom-steps"
          steps={[
            {
              title: 'Open the single atom form',
              description: <>Go to <strong className="text-ink">Create</strong>, choose <strong className="text-ink">Atom creation</strong>, then select <strong className="text-ink">Single atom</strong>.</>,
            },
            {
              title: 'Choose the atom type',
              description: <>Use <strong className="text-ink">Thing</strong> for a general concept or object, <strong className="text-ink">Person</strong> for an individual, <strong className="text-ink">Organization</strong> for a group, <strong className="text-ink">Account</strong> for a chain account, or <strong className="text-ink">Raw URI / data</strong> for an existing raw value.</>,
            },
            {
              title: 'Enter the atom details',
              description: <>For Thing, Person, and Organization atoms, enter a name. Add a clear description, HTTPS URL, and image when useful. You can upload an image from your device or paste a public HTTPS image URL and choose <strong className="text-ink">Import URL</strong>.</>,
            },
            {
              title: 'Watch the existing atom lookup',
              description: <>As you type, Collate searches the selected Intuition network. Inspect any matching atoms and reuse the correct existing atom instead of creating an unnecessary duplicate.</>,
            },
            {
              title: 'Review the atom',
              description: <>Select <strong className="text-ink">Review atom</strong>. Collate validates the fields, prepares the metadata, calculates the cost, and checks whether the exact atom already exists.</>,
            },
            {
              title: 'Read the review result',
              description: <><code className="text-ink">ready_to_create</code> can be published. <code className="text-ink">existing</code> means the atom is already on the graph. <code className="text-ink">invalid</code> explains what must be corrected before reviewing again.</>,
            },
            {
              title: 'Connect, publish, and confirm',
              description: <>Connect your wallet, make sure it is on the selected network, then choose <strong className="text-ink">Create atom</strong>. Approve the wallet transaction and wait for confirmation before closing or clearing the form.</>,
            },
          ]}
        />
        <GuideNote id="single-atom-review" label="Remember">
          Editing any field after review clears the previous review. Review again so the publish transaction always matches what is visible in the form.
        </GuideNote>
      </SectionShell>
    );
  }

  if (activeSection === 'batch-atoms-guide') {
    return (
      <SectionShell
        id="batch-atoms-guide"
        eyebrow="Creation guide 02"
        title="Create several atoms together."
        description="Prepare multiple atoms, review every row as one batch, and publish only the eligible atoms in a single transaction."
      >
        <GuideChecklist
          id="batch-atoms-before"
          title="Before you start"
          items={[
            'Choose the target network before building the batch.',
            'Gather the name, description, URL, image, type, and optional initial support for each atom.',
            'Use a smaller batch first if this is your first multi-atom transaction.',
          ]}
        />
        <GuideSteps
          id="batch-atoms-steps"
          steps={[
            {
              title: 'Open Batch atoms',
              description: <>Go to <strong className="text-ink">Create → Atom creation → Batch atoms</strong>. The form starts with two atom rows.</>,
            },
            {
              title: 'Complete each atom row',
              description: <>Choose the correct schema type for each row and enter its details. Different rows can use different atom types. Use <strong className="text-ink">+ Add atom</strong> whenever you need another row.</>,
            },
            {
              title: 'Check live lookup results',
              description: <>Existing atom lookup runs while you type. Use the results to catch likely existing atoms early, especially when several rows have familiar names.</>,
            },
            {
              title: 'Remove mistakes before review',
              description: <>Remove unwanted rows or use <strong className="text-ink">Clear form</strong> to start over. Two rows in the same batch should not describe the same atom.</>,
            },
            {
              title: 'Review all atoms',
              description: <>Choose <strong className="text-ink">Review atoms</strong>. Every row receives a status and cost. Duplicate rows inside the batch become <code className="text-ink">blocked_duplicate</code>; existing and invalid rows remain visible but blocked.</>,
            },
            {
              title: 'Verify the eligible count',
              description: <>Compare the number of eligible rows with the review table. Only rows marked <code className="text-ink">ready_to_create</code> will enter the transaction.</>,
            },
            {
              title: 'Publish the eligible atoms',
              description: <>Connect the wallet on the correct network, choose <strong className="text-ink">Publish eligible atoms</strong>, approve one transaction, and wait for the confirmation message and transaction link.</>,
            },
          ]}
        />
        <GuideNote id="batch-atoms-publish" label="Batch safety">
          Existing, duplicate, and invalid rows are never submitted. A batch can still publish successfully when some rows are blocked, as long as at least one row is ready.
        </GuideNote>
      </SectionShell>
    );
  }

  if (activeSection === 'csv-atoms-guide') {
    return (
      <SectionShell
        id="csv-atoms-guide"
        eyebrow="Creation guide 03"
        title="Create atoms from a CSV file."
        description="Choose Unchained types for classification-specific atoms, or Classic CSV for existing image-rich files. Both paths preview and review before publishing."
      >
        <section id="csv-atoms-format" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5 sm:p-6">
          <h2 className="text-xl font-medium text-ink">Choose the CSV format</h2>
          <p className="mt-3 text-sm leading-7 text-muted">In <strong className="text-ink">Unchained types</strong>, choose one of the 37 classifications. Its sample and download show the exact fields that type supports. For example:</p>
          <CsvExample>{`classification,givenName,familyName,sameAs,deposit
person,Alex,Rivera,https://example.com/alex,0`}</CsvExample>
          <p className="mt-5 text-sm leading-7 text-muted">In <strong className="text-ink">Classic CSV</strong>, keep using the existing basic or schema-aware templates for Thing, Person, Organization, Account, Raw, and attached images:</p>
          <CsvExample>{`name,description,url,image_url,deposit
Knowledge Garden,A shared place for ideas,https://example.com,https://example.com/image.jpg,0`}</CsvExample>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
            <li>Unchained field names vary by classification. Do not add unsupported columns such as <code className="text-ink">image_url</code> to a type that has no image field.</li>
            <li>The <code className="text-ink">classification</code> column allows mixed types. Combine their field columns and leave irrelevant cells blank.</li>
            <li>Use public HTTPS URLs. Separate multiple <code className="text-ink">sameAs</code> references with <code className="text-ink">|</code>.</li>
            <li>If a value contains a comma, wrap it in double quotes. Keep headers unique.</li>
            <li>Each import supports up to 50 atom rows.</li>
            <li>Unchained publishing is on Testnet during its initial validation. Classic CSV remains available on both networks.</li>
          </ul>
        </section>
        <GuideSteps
          id="csv-atoms-steps"
          steps={[
            {
              title: 'Choose a format and type',
              description: <>Go to <strong className="text-ink">Create → Atom creation → CSV import</strong>. Choose <strong className="text-ink">Unchained types</strong> for the new classification format, or <strong className="text-ink">Classic CSV</strong> for an existing file.</>,
            },
            {
              title: 'Preview and download the right sample',
              description: <>For Unchained, choose the classification and inspect its <strong className="text-ink">Sample CSV</strong> box. Download that type’s sample or place it in the editor. For Classic, use the basic or schema-aware sample menu.</>,
            },
            {
              title: 'Edit and export the spreadsheet',
              description: <>Keep the header row, replace the examples, and export as a <strong className="text-ink">.csv</strong> file. In Unchained, a row-level <code className="text-ink">classification</code> overrides the selected default. Classic uses <code className="text-ink">schema_type</code>.</>,
            },
            {
              title: 'Upload or paste the CSV',
              description: <>Choose <strong className="text-ink">Upload CSV file</strong>, or paste raw CSV text into the large text area. Loading a file places its contents into that same area so you can inspect it.</>,
            },
            {
              title: 'Preview the parsed rows',
              description: <>Choose <strong className="text-ink">Preview CSV rows</strong>. Check the classification, parsed values, row errors, and any Classic image previews. Fix the source CSV or pasted text if anything was read incorrectly, then preview again.</>,
            },
            {
              title: 'Review against the graph',
              description: <>Choose <strong className="text-ink">Review atoms</strong>. Unchained also compares same-name graph atoms. Open their details before explicitly choosing to create a distinct atom.</>,
            },
            {
              title: 'Publish eligible CSV atoms',
              description: <>Confirm the eligible count, connect the wallet on the selected network, then publish eligible atoms. Approve the single transaction and wait for confirmation.</>,
            },
          ]}
        />
        <GuideChecklist
          id="csv-atoms-review"
          title="Review checklist"
          items={[
            'Every intended row appears once and has the expected classification or Classic schema type.',
            'Only fields supported by that Unchained classification are present. Classic image previews show the correct image.',
            'Only ready_to_create rows are counted as eligible.',
            'Existing, blocked_duplicate, ambiguous, and invalid rows are understood before publishing.',
          ]}
        />
      </SectionShell>
    );
  }

  if (activeSection === 'single-list-guide') {
    return (
      <SectionShell
        id="single-list-guide"
        eyebrow="Creation guide 04"
        title="Add one atom to a list."
        description="Choose the list, choose one existing member atom, review the relationship, and publish one new list entry."
      >
        <GuideNote id="single-list-before" label="How lists work">
          A list operation needs two atoms: the <strong className="text-ink">list atom</strong>, which represents the list itself, and the <strong className="text-ink">member atom</strong>, which is the item being added. Publishing creates the list entry between them; it does not recreate either selected atom.
        </GuideNote>
        <GuideSteps
          id="single-list-steps"
          steps={[
            {
              title: 'Open Manual lists',
              description: <>Go to <strong className="text-ink">Create → Lists → Manual lists</strong> and choose the target network.</>,
            },
            {
              title: 'Select the list atom',
              description: <>Start typing in <strong className="text-ink">List atom</strong>. Search is automatic. Inspect the results and select the atom that represents the list you want to update.</>,
            },
            {
              title: 'Create the list atom if needed',
              description: <>If no correct list atom exists, choose the create suggestion. The atom form opens in a modal; complete, review, and publish it there. After confirmation, Collate selects the new atom as the list atom automatically.</>,
            },
            {
              title: 'Select one member atom',
              description: <>In <strong className="text-ink">Member 1</strong>, type the member name. Keep <strong className="text-ink">Exact match</strong> enabled when you know the label, inspect matching descriptions, and select the intended existing atom.</>,
            },
            {
              title: 'Review the list entry',
              description: <>Choose <strong className="text-ink">Review list entries</strong>. The action remains disabled until both a list atom and a member atom are selected.</>,
            },
            {
              title: 'Publish the missing entry',
              description: <><code className="text-ink">ready_to_create</code> means the member can be added. <code className="text-ink">skip_existing</code> means it is already in the list. Connect the correct wallet and publish only when the entry is ready.</>,
            },
          ]}
        />
        <GuideNote id="single-list-create" label="Missing member atom">
          If the member atom does not exist, choose <strong className="text-ink">Create atom</strong> in the member row. Complete and publish it in the modal; the newly created atom will be selected as the member automatically.
        </GuideNote>
      </SectionShell>
    );
  }

  if (activeSection === 'batch-lists-guide') {
    return (
      <SectionShell
        id="batch-lists-guide"
        eyebrow="Creation guide 05"
        title="Add several atoms to one list."
        description="Use the manual list flow to collect several existing member atoms, review them together, and publish the missing entries in one transaction."
      >
        <GuideChecklist
          id="batch-lists-before"
          title="Before you start"
          items={[
            'Identify one existing atom that represents the list, or be ready to create it in the list-atom modal.',
            'Know which existing atoms should become members of that list.',
            'When names repeat on the graph, use descriptions and images to identify the correct member atom.',
          ]}
        />
        <GuideSteps
          id="batch-lists-steps"
          steps={[
            {
              title: 'Open the manual list flow',
              description: <>Go to <strong className="text-ink">Create → Lists → Manual lists</strong>. Select or create the list atom first.</>,
            },
            {
              title: 'Choose the first member',
              description: <>Type in the first member row and select the intended atom from the automatic search results. If it is missing, create it from the row’s modal.</>,
            },
            {
              title: 'Add more member rows',
              description: <>Choose <strong className="text-ink">+ Add member</strong> for every additional atom. Search and select one atom in each row.</>,
            },
            {
              title: 'Check the chosen atoms',
              description: <>Use the selected styling, descriptions, images, types, and term details to confirm that each row points to the intended atom, not merely an atom with the same name.</>,
            },
            {
              title: 'Review all list entries',
              description: <>Choose <strong className="text-ink">Review list entries</strong>. Collate checks which entries already exist and whether the same member was selected more than once in this batch.</>,
            },
            {
              title: 'Publish the missing entries',
              description: <>Confirm the eligible count, connect the wallet on the selected network, and choose <strong className="text-ink">Publish eligible list entries</strong>. Approve one transaction for all ready rows.</>,
            },
          ]}
        />
        <GuideNote id="batch-lists-publish" label="What gets published">
          Only <code className="text-ink">ready_to_create</code> rows enter the transaction. Existing entries are <code className="text-ink">skip_existing</code>; repeated members are <code className="text-ink">blocked_duplicate</code>; incomplete rows are <code className="text-ink">invalid</code>.
        </GuideNote>
      </SectionShell>
    );
  }

  if (activeSection === 'csv-lists-guide') {
    return (
      <SectionShell
        id="csv-lists-guide"
        eyebrow="Creation guide 06"
        title="Add list members from CSV."
        description="Select the destination list, resolve spreadsheet rows to existing atoms, inspect uncertain matches, and publish only safe list entries."
      >
        <GuideNote id="csv-lists-before" label="Choose the list atom first">
          Go to <strong className="text-ink">Create → Lists → CSV import</strong>. Search for and select the atom representing your list. If it does not exist, use the create suggestion to open the modal, create the list atom, and let Collate select it automatically before continuing.
        </GuideNote>
        <section id="csv-lists-format" className="rounded-[1.1rem] border border-line/80 bg-paper/65 p-5 sm:p-6">
          <h2 className="text-xl font-medium text-ink">Build the member CSV</h2>
          <p className="mt-3 text-sm leading-7 text-muted">Use one member atom per row:</p>
          <CsvExample>{`member,description
Ethereum,A decentralized open-source blockchain system
Base,A secure low-cost builder-friendly Ethereum L2`}</CsvExample>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
            <li><code className="text-ink">member</code> should match the existing atom’s name. <code className="text-ink">name</code>, <code className="text-ink">atom</code>, <code className="text-ink">label</code>, or <code className="text-ink">subject</code> are accepted alternatives.</li>
            <li>Copy the existing atom’s description exactly into <code className="text-ink">description</code>. This is especially important when several atoms share the same name.</li>
            <li>Do not write a new summary in the description column. It is used to identify an atom that already exists on the graph.</li>
            <li>A unique exact name may resolve without a description, but duplicate names need matching descriptions or manual selection.</li>
            <li>Each import supports up to 50 member rows.</li>
          </ul>
        </section>
        <GuideSteps
          id="csv-lists-steps"
          steps={[
            {
              title: 'Download or prepare the template',
              description: <>Choose <strong className="text-ink">Download sample</strong>, keep the header row, and replace the examples with existing member atom names and their exact descriptions.</>,
            },
            {
              title: 'Upload or paste the CSV',
              description: <>Choose <strong className="text-ink">Upload CSV file</strong>, or paste the CSV text into the large input. Confirm that the selected list atom shown above is still correct.</>,
            },
            {
              title: 'Preview the imported rows',
              description: <>Choose <strong className="text-ink">Preview CSV rows</strong>. Check line numbers, names, descriptions, and row-level errors before graph resolution begins.</>,
            },
            {
              title: 'Review and resolve member atoms',
              description: <>Choose <strong className="text-ink">Review list entries</strong>. Collate searches existing atoms by exact name and uses the CSV description to safely distinguish duplicate-name results.</>,
            },
            {
              title: 'Handle uncertain rows',
              description: <>For <code className="text-ink">ambiguous</code> rows, inspect each candidate’s image, description, type, URL, creator, and expanded details, then choose <strong className="text-ink">Use this atom</strong>. Remove rows you do not intend to resolve.</>,
            },
            {
              title: 'Handle missing rows',
              description: <><code className="text-ink">missing</code> means no existing atom could be resolved. It cannot be published from the CSV list flow. Remove it, or create that member through Atom creation first and run the CSV review again.</>,
            },
            {
              title: 'Publish eligible list entries',
              description: <>Review the final eligible count, connect the wallet on the selected network, and choose <strong className="text-ink">Publish eligible list entries</strong>. Only safe, missing list relationships are submitted in one transaction.</>,
            },
          ]}
        />
        <GuideChecklist
          id="csv-lists-review"
          title="Understand the final statuses"
          items={[
            'ready_to_create: resolved safely and eligible to publish.',
            'ready_with_matches: safely resolved by description, eligible, with same-name alternatives available to inspect.',
            'skip_existing: that member is already in the selected list.',
            'blocked_duplicate: the same resolved member appears more than once in this CSV batch.',
            'ambiguous: several candidates remain and one must be selected manually.',
            'missing or invalid: blocked until removed or corrected outside this review.',
          ]}
        />
      </SectionShell>
    );
  }

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
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Atom CSV formats</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Unchained uses <code className="text-ink">classification</code>, that type&apos;s exact fields, and optional <code className="text-ink">deposit</code>. Choose a type in CSV import to see and download its sample.
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Classic keeps <code className="text-ink">name</code>, <code className="text-ink">description</code>, <code className="text-ink">url</code>, <code className="text-ink">image_url</code>, <code className="text-ink">deposit</code>, and optional <code className="text-ink">schema_type</code> fields.
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
