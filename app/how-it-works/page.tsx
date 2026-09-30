import type { Metadata } from 'next';

import { AppShell } from '@/components/app/app-shell';
import { HowItWorksPage } from '@/components/how-it-works/how-it-works-page';
import { parseHowItWorksGuide } from '@/lib/how-it-works/guides';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Simple step-by-step guides for creating atoms and lists with Collate.',
};

export default function HowItWorksRoute({
  searchParams,
}: {
  searchParams?: { guide?: string | string[] | undefined };
}) {
  const activeGuideId = parseHowItWorksGuide(searchParams?.guide);

  return (
    <AppShell fullBleed>
      <HowItWorksPage activeGuideId={activeGuideId} />
    </AppShell>
  );
}
