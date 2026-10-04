'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { getPublishFeedback, type PublishedItemKind, type PublishFeedback } from '@/lib/utils/publish-feedback';
import type { PublicIntuitionNetwork } from '@/types/api';
import type { WriteResult } from '@/types/writes';

type PublishToast = PublishFeedback & { network: PublicIntuitionNetwork };
type ShowConfirmedPublish = (input: {
  result: WriteResult;
  kind: PublishedItemKind;
  network: PublicIntuitionNetwork;
}) => void;

const PublishToastContext = createContext<ShowConfirmedPublish | null>(null);

export function PublishToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<PublishToast | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast((current) => current === toast ? null : current), 8000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showConfirmedPublish({ result, kind, network }: Parameters<ShowConfirmedPublish>[0]) {
    const feedback = getPublishFeedback(result, kind);
    if (feedback) setToast({ ...feedback, network });
  }

  const networkConfig = toast ? getIntuitionNetwork(toast.network) : null;

  return (
    <PublishToastContext.Provider value={showConfirmedPublish}>
      {children}
      {toast && networkConfig ? (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-center sm:top-6">
          <div role="status" aria-atomic="true" className="publish-toast-enter pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-xl">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accentSoft text-successInk">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="m4 10 4 4 8-9" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              <p className="mt-1 text-xs text-muted">Confirmed on {networkConfig.name}.</p>
              <a
                href={`${networkConfig.explorerUrl}/tx/${toast.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-sm text-xs font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View transaction on explorer
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
                  <path d="M8 5h7v7M15 5l-9 9M13 15H5V7" />
                </svg>
              </a>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss confirmation"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </PublishToastContext.Provider>
  );
}

export function usePublishToast(): ShowConfirmedPublish {
  const showConfirmedPublish = useContext(PublishToastContext);
  if (!showConfirmedPublish) throw new Error('usePublishToast must be used inside PublishToastProvider.');
  return showConfirmedPublish;
}
