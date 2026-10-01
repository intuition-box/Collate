import Link from 'next/link';
import { Fragment } from 'react';

import { GuideTemplateDownloads } from '@/components/how-it-works/guide-template-downloads';
import {
  HOW_IT_WORKS_GUIDES,
  getHowItWorksGuide,
  getHowItWorksHref,
  type GuideVisualKind,
  type HowItWorksGuideId,
} from '@/lib/how-it-works/guides';
import { getCreateFlowHref } from '@/lib/navigation/create-flow';

const workflowSteps = [
  { index: '01', label: 'Prepare', description: 'Choose a path and add the details.' },
  { index: '02', label: 'Review', description: 'See matches, blockers, and eligible rows.' },
  { index: '03', label: 'Publish', description: 'Approve only the reviewed write.' },
  { index: '04', label: 'Confirm', description: 'Wait for the network result.' },
];

const sharedReviewStates = [
  ['Ready', 'Eligible for the next transaction.'],
  ['Existing', 'Already available and left out.'],
  ['Duplicate', 'Repeated in the current batch.'],
  ['Ambiguous', 'Needs a careful candidate choice.'],
  ['Missing', 'No existing list member was found.'],
  ['Invalid', 'Needs a correction before review.'],
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M4 10h11" />
      <path d="m11 6 4 4-4 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="m4 10 4 4 8-9" />
    </svg>
  );
}

function MiniStatus({ children, ready = false }: { children: string; ready?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ready ? 'bg-accentSoft text-ink' : 'bg-paper text-muted'}`}>
      {children}
    </span>
  );
}

function GuideBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-paper">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-warning">
        <path d="m10 1.8 2.25 4.56 5.03.73-3.64 3.55.86 5.01L10 13.29l-4.5 2.36.86-5.01-3.64-3.55 5.03-.73L10 1.8Z" />
      </svg>
      {children}
    </span>
  );
}

function GuideTaskIcon({ id, selected }: { id: HowItWorksGuideId; selected: boolean }) {
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selected ? 'border-ink bg-ink text-paper' : 'border-line bg-paper/70 text-muted'}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
        {id === 'single-atom' ? <circle cx="12" cy="12" r="5" /> : null}
        {id === 'batch-atoms' ? (
          <>
            <circle cx="7" cy="8" r="2.5" />
            <circle cx="17" cy="8" r="2.5" />
            <circle cx="12" cy="17" r="2.5" />
          </>
        ) : null}
        {id === 'csv-atoms' ? (
          <>
            <path d="M6 3.5h8l4 4V20.5H6z" />
            <path d="M14 3.5v4h4M9 12h6M9 16h6" />
          </>
        ) : null}
        {id === 'single-list' ? (
          <>
            <circle cx="7" cy="12" r="3" />
            <circle cx="17" cy="12" r="3" />
            <path d="M10 12h4" />
          </>
        ) : null}
        {id === 'batch-lists' ? (
          <>
            <circle cx="6" cy="6" r="2" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="12" r="3" />
            <path d="m8 6 7.3 4.2M8 12h7M8 18l7.3-4.2" />
          </>
        ) : null}
        {id === 'csv-lists' ? (
          <>
            <path d="M5 3.5h7l3 3V12M12 3.5v3h3" />
            <circle cx="9" cy="17" r="2.5" />
            <circle cx="18" cy="17" r="2.5" />
            <path d="M11.5 17h4" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function VisualShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="img" aria-label={label} className="overflow-hidden rounded-2xl border border-line bg-white/85">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-xs uppercase tracking-terminal text-muted">{label}</p>
        <span className="h-2 w-2 rounded-full bg-ink/20" />
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function SingleAtomVisual() {
  return (
    <VisualShell label="Single atom">
      <div className="space-y-3">
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
          <div className="rounded-xl border border-line bg-paper/70 p-3 text-xs text-muted">Thing</div>
          <div className="rounded-xl border border-line bg-paper/70 p-3 text-sm text-ink">Knowledge Garden</div>
        </div>
        <div className="h-20 rounded-xl border border-line bg-paper/55 p-3 text-xs leading-5 text-muted">
          A shared place for ideas and open knowledge.
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Review result</p>
              <p className="mt-1 text-sm font-medium text-ink">No exact atom found</p>
            </div>
            <MiniStatus ready>Ready</MiniStatus>
          </div>
        </div>
      </div>
    </VisualShell>
  );
}

function BatchAtomsVisual() {
  const rows = [
    ['Knowledge Garden', 'Ready'],
    ['Open data builders', 'Ready'],
    ['saulo.eth', 'Existing'],
  ] as const;

  return (
    <VisualShell label="Atom review">
      <div className="space-y-2">
        {rows.map(([name, status], index) => (
          <div key={name} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line bg-white p-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper font-mono text-xs text-muted">{index + 1}</span>
            <p className="truncate text-sm text-ink">{name}</p>
            <MiniStatus ready={status === 'Ready'}>{status}</MiniStatus>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 text-xs text-muted">
          <span>3 reviewed</span>
          <span className="rounded-full bg-ink px-3 py-2 font-medium text-paper">Publish 2 atoms</span>
        </div>
      </div>
    </VisualShell>
  );
}

function CsvAtomsVisual() {
  return (
    <VisualShell label="CSV preview">
      <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-line bg-ink p-4 text-paper">
          <p className="font-mono text-xs text-paper/55">atoms.csv</p>
          <p className="mt-6 font-mono text-xs leading-6 text-paper/75">name,description</p>
          <p className="font-mono text-xs leading-6 text-paper/75">Knowledge Garden,...</p>
          <p className="font-mono text-xs leading-6 text-paper/75">Open builders,...</p>
        </div>
        <div className="space-y-2">
          {['Knowledge Garden', 'Open builders'].map((name, index) => (
            <div key={name} className="rounded-xl border border-line bg-paper/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-ink">{name}</p>
                <span className="font-mono text-xs text-muted">0{index + 2}</span>
              </div>
              <p className="mt-2 text-xs text-muted">Thing · Parsed correctly</p>
            </div>
          ))}
        </div>
      </div>
    </VisualShell>
  );
}

function SingleListVisual() {
  return (
    <VisualShell label="One list entry">
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-paper/65 p-4">
          <p className="text-sm font-medium text-muted">List</p>
          <p className="mt-2 text-base font-medium text-ink">Favorite protocols</p>
        </div>
        <div className="flex justify-center text-muted">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path d="M12 4v16M7 15l5 5 5-5" />
          </svg>
        </div>
        <div className="rounded-xl border border-ink/20 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">Member</p>
              <p className="mt-2 text-base font-medium text-ink">Ethereum</p>
              <p className="mt-1 text-xs text-muted">Decentralized blockchain system</p>
            </div>
            <MiniStatus ready>Selected</MiniStatus>
          </div>
        </div>
      </div>
    </VisualShell>
  );
}

function BatchListsVisual() {
  return (
    <VisualShell label="List entry review">
      <div className="rounded-xl bg-ink p-4 text-paper">
        <p className="text-sm font-medium text-paper/60">List</p>
        <p className="mt-2 text-base font-medium">Open data communities</p>
      </div>
      <div className="mt-3 grid gap-2">
        {([
          ['Knowledge Garden', 'Ready'],
          ['Data Commons', 'Ready'],
          ['Open builders', 'Existing'],
        ] as const).map(([name, status]) => (
          <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-3">
            <p className="truncate text-sm text-ink">{name}</p>
            <MiniStatus ready={status === 'Ready'}>{status}</MiniStatus>
          </div>
        ))}
      </div>
    </VisualShell>
  );
}

function CsvListsVisual() {
  return (
    <VisualShell label="Member resolution">
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-paper/60 p-3 font-mono text-xs leading-6 text-muted">
          Netflix,Subscription streaming service
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-ink/25 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink">Netflix</p>
              <span className="h-2 w-2 rounded-full bg-accent" />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">Subscription streaming service.</p>
            <p className="mt-3 text-xs font-medium text-ink">Description match</p>
          </div>
          <div className="rounded-xl border border-line bg-paper/50 p-3">
            <p className="text-sm font-medium text-ink">Netflix</p>
            <p className="mt-2 text-xs leading-5 text-muted">A protocol project with the same name.</p>
            <p className="mt-3 text-xs text-muted">Alternative</p>
          </div>
        </div>
        <div className="flex justify-end"><MiniStatus ready>Ready with matches</MiniStatus></div>
      </div>
    </VisualShell>
  );
}

function GuideVisual({ kind }: { kind: GuideVisualKind }) {
  if (kind === 'single-atom') return <SingleAtomVisual />;
  if (kind === 'batch-atoms') return <BatchAtomsVisual />;
  if (kind === 'csv-atoms') return <CsvAtomsVisual />;
  if (kind === 'single-list') return <SingleListVisual />;
  if (kind === 'batch-lists') return <BatchListsVisual />;
  return <CsvListsVisual />;
}

export function HowItWorksPage({ activeGuideId }: { activeGuideId: HowItWorksGuideId }) {
  const activeGuide = getHowItWorksGuide(activeGuideId);
  const atomGuides = HOW_IT_WORKS_GUIDES.filter((guide) => guide.category === 'atoms');
  const listGuides = HOW_IT_WORKS_GUIDES.filter((guide) => guide.category === 'lists');

  return (
    <main className="overflow-hidden">
      <section className="px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
        <div className="home-reveal mx-auto max-w-[86rem]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.7fr)] lg:items-end lg:justify-between lg:gap-16">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">
              Know every step <span className="font-serif font-normal italic">before you sign.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8 lg:justify-self-end">
              Choose a task below for a complete walkthrough, from preparing your data to confirming the finished transaction.
            </p>
          </div>

          <div className="mt-9 overflow-hidden rounded-2xl border border-line bg-line">
            <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
              {workflowSteps.map((step, index) => (
                <div key={step.label} className={`p-4 sm:p-5 ${index === workflowSteps.length - 1 ? 'bg-accentSoft' : 'bg-paper'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-muted">{step.index}</span>
                    {index === workflowSteps.length - 1 ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-black"><CheckIcon /></span> : null}
                  </div>
                  <p className="mt-5 text-base font-medium text-ink">{step.label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="choose-guide" className="scroll-mt-6 border-y border-line bg-white/72 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[86rem]">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-6xl">Start with what you want to do.</h2>
            <p className="mt-5 text-base leading-8 text-muted">Pick a task. The page will show only the steps, checks, and decisions that matter for that path.</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              ['Atoms', atomGuides],
              ['Lists', listGuides],
            ].map(([label, guides]) => (
              <div key={label as string} className="rounded-3xl border border-line bg-paper/45 p-4 sm:p-5">
                <p className="px-2 pb-4 text-base font-semibold tracking-[-0.02em] text-ink sm:text-lg">{label as string}</p>
                <div className="space-y-1">
                  {(guides as typeof HOW_IT_WORKS_GUIDES).map((guide, index) => {
                    const selected = guide.id === activeGuide.id;
                    return (
                      <Fragment key={guide.id}>
                        {index > 0 ? (
                          <div aria-hidden="true" className="flex items-center gap-3 px-4 py-1 text-muted">
                            <span className="h-px flex-1 bg-line" />
                            <span className="font-serif text-sm italic">or</span>
                            <span className="h-px flex-1 bg-line" />
                          </div>
                        ) : null}
                        <Link
                          href={getHowItWorksHref(guide.id)}
                          aria-current={selected ? 'page' : undefined}
                          className={`group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:p-4 ${selected ? 'border-ink bg-white' : 'border-transparent bg-white/55 hover:border-line hover:bg-white'}`}
                        >
                          <GuideTaskIcon id={guide.id} selected={selected} />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-ink sm:text-base">{guide.title}</span>
                              {guide.badge ? <GuideBadge>{guide.badge}</GuideBadge> : null}
                            </span>
                            <span className="mt-1 hidden text-sm leading-6 text-muted sm:block">{guide.shortDescription}</span>
                          </span>
                          <span className="text-muted transition-transform group-hover:translate-x-0.5"><ArrowIcon /></span>
                        </Link>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="walkthrough" className="scroll-mt-6 px-5 py-20 sm:px-8 sm:py-28">
        <div key={activeGuide.id} className="home-reveal mx-auto max-w-[86rem]">
          <div className="flex flex-col gap-6 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {activeGuide.badge ? <div className="mb-5"><GuideBadge>{activeGuide.badge}</GuideBadge></div> : null}
              <h2 className="text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-6xl">{activeGuide.title}</h2>
              <p className="mt-5 text-base leading-8 text-muted">{activeGuide.summary}</p>
            </div>
            <Link href={getCreateFlowHref(activeGuide.createFlow)} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:self-auto">
              Open this flow
              <ArrowIcon />
            </Link>
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)] lg:items-start lg:gap-16">
            <aside className="space-y-6 lg:sticky lg:top-6">
              <GuideVisual kind={activeGuide.visual} />
              <div className="rounded-2xl border border-line bg-paper/55 p-5">
                <h3 className="text-lg font-medium text-ink">Before you start</h3>
                <ul className="mt-4 space-y-3">
                  {activeGuide.prerequisites.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink"><CheckIcon /></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <article className="min-w-0">
              <h3 className="text-lg font-medium text-ink">Step by step</h3>
              <div className="mt-5 divide-y divide-line border-y border-line">
                {activeGuide.steps.map((step, index) => (
                  <div key={step.title} className="grid gap-4 py-6 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="text-lg font-medium text-ink">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted">{step.description}</p>
                      {step.emphasis ? <p className="mt-3 text-sm font-semibold leading-7 text-ink">{step.emphasis}</p> : null}
                      {step.action ? <GuideTemplateDownloads action={step.action} /> : null}
                    </div>
                  </div>
                ))}
              </div>

              {activeGuide.csvExample ? (
                <div className="mt-8 rounded-2xl border border-line bg-white/75 p-5">
                  <h3 className="text-lg font-medium text-ink">Example CSV</h3>
                  <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 font-mono text-xs leading-6 text-paper"><code>{activeGuide.csvExample}</code></pre>
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-paper/55 p-5">
                  <h3 className="text-lg font-medium text-ink">Keep in mind</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                    {activeGuide.tips.map((tip) => <li key={tip}>• {tip}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white/75 p-5">
                  <h3 className="text-lg font-medium text-ink">What review may show</h3>
                  <div className="mt-4 space-y-3">
                    {activeGuide.outcomes.map((outcome) => (
                      <div key={outcome.label}>
                        <p className="text-sm font-medium text-ink">{outcome.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">{outcome.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white/72 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[86rem]">
          <div className="grid gap-8 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)] lg:items-start">
            <div>
              <h2 className="text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl">Every row tells you what happens next.</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted">The label beside a row explains whether it will be created, reused, skipped, or held back for your attention.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sharedReviewStates.map(([label, description], index) => (
                <div key={label} className="rounded-2xl border border-line bg-paper/45 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-accent' : 'bg-ink/20'}`} />
                    <p className="text-sm font-medium text-ink">{label}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto flex max-w-[86rem] flex-col gap-8 rounded-3xl bg-ink px-6 py-12 text-paper sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Take the guide with you into the workspace.</h2>
            <p className="mt-4 text-sm leading-7 text-paper/65">Your selected flow will open directly. Prepare freely, review carefully, and connect your wallet only when you are ready.</p>
          </div>
          <Link href={getCreateFlowHref(activeGuide.createFlow)} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-sm font-medium text-black transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:self-auto">
            Open {activeGuide.title.toLowerCase()}
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </main>
  );
}
