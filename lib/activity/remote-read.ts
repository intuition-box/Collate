import { enrichActivityItems } from '@/lib/activity/enrich-items';
import type {
  ActivityItemRecord,
  ActivityItemsResponse,
  ActivitySummaryResponse,
  ConfirmedActivityItem,
} from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

const DEFAULT_ACTIVITY_READ_ORIGIN = 'https://collate.intuition.box';
const REMOTE_READ_TIMEOUT_MS = 5000;

type RemoteFetcher = (url: string, init: RequestInit) => Promise<Response>;
type ItemEnricher = (items: ActivityItemRecord[]) => Promise<ConfirmedActivityItem[]>;

interface RemoteReadOptions {
  origin?: string;
  fetcher?: RemoteFetcher;
  enrichItems?: ItemEnricher;
}

interface ItemFilters {
  network: PublicIntuitionNetwork | null;
  kind: ActivityItemRecord['kind'] | null;
  wallet: string | null;
  cursor: string | null;
  limit: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isActivityItemRecord(value: unknown): value is ActivityItemRecord {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && (value.kind === 'atom' || value.kind === 'list_entry' || value.kind === 'claim')
    && (value.network === 'mainnet' || value.network === 'testnet')
    && typeof value.protocolId === 'string'
    && typeof value.txHash === 'string'
    && typeof value.creatorWallet === 'string'
    && typeof value.createdAt === 'string';
}

function hasDisplay(value: ActivityItemRecord): value is ConfirmedActivityItem {
  const display = (value as ConfirmedActivityItem).display;
  if (!isRecord(display)) return false;
  if (display.state === 'pending' || display.state === 'unavailable') return true;
  if (display.state !== 'ready' && display.state !== 'partial') return false;
  if (isRecord(display.atom) && typeof display.atom.label === 'string') return true;
  return isRecord(display.triple);
}

export function shouldReadRemoteActivity(environment: { NODE_ENV?: string; DATABASE_URL?: string } = process.env): boolean {
  return environment.NODE_ENV === 'development' && !environment.DATABASE_URL?.trim();
}

async function fetchRemoteActivity(
  resource: 'summary' | 'items',
  params: URLSearchParams,
  options: RemoteReadOptions,
): Promise<unknown> {
  const origin = new URL(options.origin || process.env.ACTIVITY_READ_ORIGIN?.trim() || DEFAULT_ACTIVITY_READ_ORIGIN);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('ACTIVITY_READ_ORIGIN must be a public HTTPS origin.');
  }

  const url = new URL(`/api/activity/${resource}`, origin);
  url.search = params.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_READ_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Live activity returned HTTP ${response.status}.`);
    return await response.json() as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readRemoteActivitySummary(
  network: PublicIntuitionNetwork | null,
  options: RemoteReadOptions = {},
): Promise<ActivitySummaryResponse> {
  const params = new URLSearchParams();
  if (network) params.set('network', network);
  const payload = await fetchRemoteActivity('summary', params, options);
  if (!isRecord(payload) || !isRecord(payload.totals) || !Array.isArray(payload.leaderboard)) {
    throw new Error('Live activity summary has an unexpected format.');
  }
  return payload as unknown as ActivitySummaryResponse;
}

export async function readRemoteActivityItems(
  filters: ItemFilters,
  options: RemoteReadOptions = {},
): Promise<ActivityItemsResponse> {
  const params = new URLSearchParams();
  if (filters.network) params.set('network', filters.network);
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.wallet) params.set('wallet', filters.wallet);
  if (filters.cursor) params.set('cursor', filters.cursor);
  params.set('limit', String(filters.limit));

  const payload = await fetchRemoteActivity('items', params, options);
  if (!isRecord(payload)
    || !Array.isArray(payload.items)
    || !payload.items.every(isActivityItemRecord)
    || (payload.nextCursor !== null && typeof payload.nextCursor !== 'string')) {
    throw new Error('Live activity items have an unexpected format.');
  }

  const items = payload.items as ActivityItemRecord[];
  return {
    items: items.every(hasDisplay) ? items : await (options.enrichItems ?? enrichActivityItems)(items),
    nextCursor: payload.nextCursor,
  };
}
