'use client';

import type {
  ActivityConfirmationResponse,
  ActivityIntentRequest,
  ActivityIntentResponse,
  ActivityOutboxEntry,
} from '@/types/activity';

const OUTBOX_KEY = 'collate.activity.outbox.v1';
const INTENT_TIMEOUT_MS = 5_000;
const CONFIRM_TIMEOUT_MS = 15_000;
const MAX_OUTBOX_ENTRIES = 100;
const MAX_OUTBOX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let flushPromise: Promise<void> | null = null;

function readOutbox(): ActivityOutboxEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(OUTBOX_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is ActivityOutboxEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<ActivityOutboxEntry>;
      return (
        typeof candidate.intentId === 'string' &&
        (candidate.network === 'mainnet' || candidate.network === 'testnet') &&
        typeof candidate.txHash === 'string' &&
        typeof candidate.queuedAt === 'string' &&
        Date.now() - new Date(candidate.queuedAt).getTime() < MAX_OUTBOX_AGE_MS
      );
    });
  } catch {
    return [];
  }
}

function writeOutbox(entries: ActivityOutboxEntry[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(-MAX_OUTBOX_ENTRIES)));
  } catch {
    // Tracking remains best effort when browser storage is unavailable.
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function createActivityIntentBestEffort(
  request: ActivityIntentRequest,
): Promise<ActivityIntentResponse | null> {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetchWithTimeout(
      '/api/activity/intent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        cache: 'no-store',
      },
      INTENT_TIMEOUT_MS,
    );

    if (!response.ok) return null;
    const payload = (await response.json()) as Partial<ActivityIntentResponse>;

    return typeof payload.intentId === 'string' && typeof payload.expiresAt === 'string'
      ? { intentId: payload.intentId, expiresAt: payload.expiresAt }
      : null;
  } catch {
    return null;
  }
}

export function enqueueActivityConfirmation(entry: Omit<ActivityOutboxEntry, 'queuedAt'>): void {
  const current = readOutbox().filter((candidate) => candidate.intentId !== entry.intentId);
  current.push({ ...entry, queuedAt: new Date().toISOString() });
  writeOutbox(current);
}

async function flushEntries() {
  const entries = readOutbox();
  if (entries.length === 0) return;

  const retained: ActivityOutboxEntry[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;

    try {
      const response = await fetchWithTimeout(
        '/api/activity/confirm',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intentId: entry.intentId, network: entry.network, txHash: entry.txHash }),
          cache: 'no-store',
        },
        CONFIRM_TIMEOUT_MS,
      );

      if (response.status === 202) {
        retained.push(entry);
        continue;
      }

      if (response.ok) {
        const payload = (await response.json()) as Partial<ActivityConfirmationResponse>;
        if (payload.retryable || payload.status === 'intent' || payload.status === 'pending') retained.push(entry);
        continue;
      }

      if (response.status === 429 || response.status >= 500) retained.push(entry);
    } catch {
      retained.push(entry, ...entries.slice(index + 1));
      break;
    }
  }

  writeOutbox(retained);
}

export function flushActivityOutbox(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (flushPromise) return flushPromise;

  flushPromise = flushEntries().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
