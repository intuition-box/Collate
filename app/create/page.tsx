import { AppShell } from '@/components/app/app-shell';
import { AtomCreationWorkspace } from '@/components/atoms/atom-creation-workspace';
import { SessionSidebar } from '@/components/app/session-sidebar';
import { parseCreateFlow } from '@/lib/navigation/create-flow';

export const dynamic = 'force-dynamic';

export default function CreatePage({
  searchParams,
}: {
  searchParams?: { flow?: string | string[] | undefined };
}) {
  const initialFlow = parseCreateFlow(searchParams?.flow);

  return (
    <AppShell>
      <div className="grid gap-8 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <SessionSidebar />
        <section className="space-y-6">
          <AtomCreationWorkspace key={initialFlow} initialFlow={initialFlow} />
        </section>
      </div>
    </AppShell>
  );
}
