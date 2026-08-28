'use client';

import { useEffect, type ReactNode } from 'react';

import { flushActivityOutbox } from '@/lib/activity/client';

const RETRY_INTERVAL_MS = 30_000;

export function ActivityOutboxProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const flush = () => void flushActivityOutbox();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') flush();
    };

    flush();
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = window.setInterval(flush, RETRY_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, []);

  return children;
}
