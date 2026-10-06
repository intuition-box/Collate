import type { Metadata } from 'next';
import Image from 'next/image';

import { AppShell } from '@/components/app/app-shell';

const relicUrl =
  'https://opensea.io/item/ethereum/0x7ab2f10cac6e27971fa93a5d5470bb84126bb734/9543';

export const metadata: Metadata = {
  title: 'Overmind',
  description: 'Overmind is coming soon to Collate.',
  robots: { index: false, follow: false },
};

export default function OvermindPage() {
  return (
    <AppShell fullBleed>
      <main className="px-5 sm:px-8">
        <section
          aria-labelledby="overmind-title"
          className="relative isolate mx-auto flex min-h-[72svh] w-full max-w-[92rem] flex-col overflow-hidden rounded-3xl bg-[#181818] px-6 py-8 text-white sm:min-h-[76svh] sm:px-10 sm:py-10 lg:px-16"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <Image
              src="/images/overmind-relic.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-110 object-cover object-center opacity-70 blur-sm sm:scale-100"
            />
            <div className="absolute inset-0 bg-black/35" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-terminal text-white/65">
            <span>Collate / Overmind</span>
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          </div>

          <div className="home-reveal relative z-10 my-auto py-20 text-center">
            <p className="mb-5 text-sm font-medium uppercase tracking-terminal text-accent sm:mb-8">Overmind</p>
            <h1
              id="overmind-title"
              className="mx-auto max-w-5xl text-balance text-6xl font-semibold uppercase tracking-[-0.075em] text-white sm:text-8xl lg:text-9xl"
            >
              Coming soon<span className="text-accent">.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-pretty text-base text-white/70 sm:text-lg">
              Something new is taking shape.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 text-xs text-white/55">
            <span>More to be revealed.</span>
            <a
              href={relicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline decoration-white/40 underline-offset-4 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Relics by Intuition artwork
            </a>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
