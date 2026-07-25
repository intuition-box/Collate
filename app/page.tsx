import Link from 'next/link';

import { AppShell } from '@/components/app/app-shell';
import { HomeTypewriterWord } from '@/components/home-typewriter-word';

const reviewRows = [
  { name: 'Knowledge Garden', type: 'Thing', status: 'Ready' },
  { name: 'saulo.eth', type: 'Person', status: 'Existing' },
  { name: 'Open data builders', type: 'Organization', status: 'Ready' },
];

const benefits = [
  {
    number: '01',
    title: 'Create at your scale',
    description: 'Start with one atom when that is all you need. Add rows or import a CSV when the job gets bigger.',
  },
  {
    number: '02',
    title: 'See the outcome first',
    description: 'Every row is validated and classified before a wallet signature enters the picture.',
  },
  {
    number: '03',
    title: 'Write once with intent',
    description: 'Eligible atoms or list entries are prepared into one focused transaction while blocked rows stay out.',
  },
];

const flowSteps = [
  ['Prepare', 'Enter one item or bring the whole CSV.'],
  ['Resolve', 'Find existing atoms and duplicate entries.'],
  ['Review', 'Know exactly what is ready or blocked.'],
  ['Publish', 'Sign only the eligible protocol writes.'],
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <path d="M4 10h11" />
      <path d="m11 6 4 4-4 4" />
    </svg>
  );
}

function ReviewBoard() {
  return (
    <div className="home-visual relative mx-auto mt-10 w-full max-w-6xl sm:mt-14">
      <div className="home-glow pointer-events-none absolute inset-x-[-8%] top-1/2 h-72 -translate-y-1/2 rounded-[50%] blur-3xl sm:inset-x-[4%]" />

      <div className="relative grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-stretch">
        <div className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1 lg:grid-cols-1 lg:content-center">
          <div className="rounded-[1.25rem] border border-white/60 bg-white/80 p-5 text-left shadow-[0_24px_70px_rgba(27,20,40,0.11)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.62rem] uppercase tracking-terminal text-muted">Duplicate check</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning" />
            </div>
            <p className="mt-8 text-sm font-medium leading-6 text-ink">Nothing accidental gets through.</p>
            <p className="mt-2 text-xs leading-5 text-muted">Existing atoms are found before publishing.</p>
          </div>

          <div className="rounded-[1.25rem] bg-ink p-5 text-left text-paper shadow-[0_24px_70px_rgba(27,20,40,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.62rem] uppercase tracking-terminal text-paper/55">Transaction</span>
              <span className="rounded-full bg-accent px-2 py-1 text-[0.6rem] font-semibold text-black">ONE WRITE</span>
            </div>
            <p className="mt-7 font-serif text-3xl leading-none">2 ready</p>
            <p className="mt-2 text-xs leading-5 text-paper/60">1 existing row safely left out.</p>
          </div>
        </div>

        <div className="home-board order-1 overflow-hidden rounded-[1.4rem] border border-white/60 bg-white/88 shadow-[0_34px_100px_rgba(45,25,55,0.17)] backdrop-blur-2xl lg:order-2">
          <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-4 sm:items-center sm:px-6">
            <div className="min-w-0 text-left">
              <p className="text-[0.62rem] uppercase tracking-terminal text-muted">Review queue</p>
              <p className="mt-1 text-sm font-medium leading-5 text-ink">Your batch before it reaches the chain</p>
            </div>
            <span className="shrink-0 rounded-full bg-accentSoft px-3 py-1 text-xs font-medium text-ink">2 eligible</span>
          </div>

          <div className="divide-y divide-line/60 px-2 sm:px-4">
            {reviewRows.map((row, index) => (
              <div key={row.name} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-2 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto] sm:gap-3 sm:py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-xs text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-ink">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted sm:hidden">{row.type}</p>
                </div>
                <span className="hidden text-xs text-muted sm:block">{row.type}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.65rem] font-medium ${
                    row.status === 'Ready' ? 'bg-accentSoft text-ink' : 'bg-paper text-muted'
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-line/70 bg-paper/55 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-left text-xs leading-5 text-muted">Only eligible rows will be submitted.</p>
            <span className="self-start rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper sm:self-auto">Publish 2 atoms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell fullBleed>
      <main className="overflow-hidden">
        <section className="relative px-4 pb-14 pt-10 text-center sm:px-8 sm:pb-20 sm:pt-24">
          <div className="home-reveal mx-auto max-w-6xl">
            <p className="font-serif text-lg italic text-muted sm:text-xl">One atom or one thousand.</p>
            <h1 className="mx-auto mt-5 max-w-6xl text-[2.8rem] font-semibold leading-[0.92] tracking-[-0.055em] text-ink min-[390px]:text-[3.2rem] sm:text-7xl sm:tracking-[-0.065em] lg:text-[6.1rem] lg:leading-[0.86] lg:tracking-[-0.075em] xl:text-[6.7rem]">
              <HomeTypewriterWord />
              <span className="block font-serif font-normal italic tracking-[-0.065em]">Skip the busywork.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              A community workspace for creating Intuition atoms and lists with fast imports, visible duplicate checks,
              and no surprises before you sign.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-transform duration-200 hover:-translate-y-0.5"
              >
                Start creating
                <ArrowIcon />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/70 px-6 py-3 text-sm font-medium text-ink transition-colors duration-150 hover:border-ink/30"
              >
                See how it works
              </Link>
            </div>
          </div>

          <ReviewBoard />
        </section>

        <section className="border-t border-line/70 bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-[82rem]">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
              <h2 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.065em] text-ink sm:text-7xl lg:text-[5.8rem]">
                Designed to help you publish more
                <span className="font-serif font-normal italic"> with less friction.</span>
              </h2>
              <p className="max-w-md text-base leading-8 text-muted lg:pb-2">
                Built for contributors who care about clean data but would rather not create it one repetitive form at a
                time.
              </p>
            </div>

            <div className="mt-20 grid border-y border-line/80 md:grid-cols-3">
              {benefits.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className={`py-7 md:px-7 ${index > 0 ? 'border-t border-line/80 md:border-l md:border-t-0' : ''}`}
                >
                  <p className="font-mono text-[0.65rem] text-muted">{benefit.number}</p>
                  <h3 className="mt-8 text-lg font-medium text-ink">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full px-5 py-8 sm:px-8 sm:py-10">
          <div className="atmosphere-texture atmosphere-dark home-pipeline relative mx-auto box-border w-full max-w-[86rem] overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-paper sm:px-10 sm:py-20 xl:px-16">
            <div className="absolute -right-32 -top-52 h-[34rem] w-[34rem] rounded-full bg-accent opacity-90 blur-[1px]" />
            <div className="absolute -right-12 top-8 h-52 w-52 rounded-full bg-white/75 blur-3xl" />

            <div className="relative grid min-w-0 gap-14 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)] xl:gap-20">
              <div className="min-w-0">
                <p className="text-[0.7rem] uppercase tracking-terminal text-paper/55">Before the signature</p>
                <h2 className="mt-5 max-w-xl text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                  From rough input to a deliberate write.
                </h2>
                <p className="mt-6 max-w-md text-sm leading-7 text-paper/65">
                  The workspace does the repetitive checking up front so your wallet approval is the final step rather
                  than the first leap of faith.
                </p>
                <Link
                  href="/create"
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-black transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Open the workspace
                  <ArrowIcon />
                </Link>
              </div>

              <div className="relative min-w-0 divide-y divide-paper/15 border-y border-paper/20">
                {flowSteps.map(([title, description], index) => (
                  <div key={title} className="grid min-w-0 gap-3 py-5 sm:grid-cols-[2.5rem_7rem_minmax(0,1fr)] sm:items-center">
                    <span className="font-mono text-xs text-accent">0{index + 1}</span>
                    <h3 className="text-base font-medium text-paper">{title}</h3>
                    <p className="min-w-0 text-sm leading-6 text-paper/60">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
