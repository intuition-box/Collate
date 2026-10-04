import { getReadableError } from '@/lib/utils/creation-error';

export function ErrorNotice({ message, className = '' }: { message: string; className?: string }) {
  const { summary, details } = getReadableError(message);

  return (
    <div className={`min-w-0 max-w-full rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-danger/40 text-xs font-semibold text-dangerInk">!</span>
        <div className="min-w-0 flex-1">
          <p role="alert" className="break-words text-sm leading-6 text-ink [overflow-wrap:anywhere]">{summary}</p>
          {details ? (
            <details key={message} className="mt-2 min-w-0 max-w-full">
              <summary className="w-fit cursor-pointer rounded-sm text-xs font-medium text-dangerInk underline decoration-danger/40 underline-offset-4 hover:decoration-dangerInk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                Technical details
              </summary>
              <pre className="mt-2 max-h-56 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-lg border border-line bg-paper/70 p-3 font-mono text-xs leading-5 text-muted">{details}</pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
