import { queryIntuitionGraph } from '@/lib/intuition/graph';
import { GRAPH_ATOM_FIELDS, mapGraphAtom, type GraphAtom } from '@/lib/intuition/graph-atoms';
import type { ActivityAtomDetails, ActivityItemRecord, ConfirmedActivityItem } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

const GRAPH_BATCH_SIZE = 80;
const GRAPH_TIMEOUT_MS = 4000;

const ACTIVITY_ATOMS_QUERY = `
  query ActivityAtoms($ids: [String!]!, $limit: Int!) {
    atoms(where: { term_id: { _in: $ids } }, limit: $limit) {
      ${GRAPH_ATOM_FIELDS}
    }
  }
`;

export type ActivityAtomFetcher = (
  network: PublicIntuitionNetwork,
  ids: string[],
  signal: AbortSignal,
) => Promise<GraphAtom[]>;

async function fetchActivityAtoms(network: PublicIntuitionNetwork, ids: string[], signal: AbortSignal) {
  const response = await queryIntuitionGraph<{ atoms: GraphAtom[] }, { ids: string[]; limit: number }>(
    network,
    ACTIVITY_ATOMS_QUERY,
    { ids, limit: ids.length },
    signal,
  );
  return response.atoms;
}

function itemIds(item: ActivityItemRecord): string[] {
  return item.kind === 'atom'
    ? [item.protocolId]
    : [item.subjectId, item.predicateId, item.objectId].filter((id): id is `0x${string}` => id !== null);
}

function graphKey(network: PublicIntuitionNetwork, id: string): string {
  return `${network}:${id.toLowerCase()}`;
}

export async function enrichActivityItems(
  items: ActivityItemRecord[],
  fetchAtoms: ActivityAtomFetcher = fetchActivityAtoms,
): Promise<ConfirmedActivityItem[]> {
  const byNetwork = new Map<PublicIntuitionNetwork, Map<string, string>>();
  for (const item of items) {
    const ids = byNetwork.get(item.network) ?? new Map<string, string>();
    for (const id of itemIds(item)) ids.set(id.toLowerCase(), id);
    byNetwork.set(item.network, ids);
  }

  const details = new Map<string, ActivityAtomDetails>();
  const failedIds = new Set<string>();
  const batches: Array<{ network: PublicIntuitionNetwork; ids: string[] }> = [];
  for (const [network, ids] of byNetwork) {
    const uniqueIds = [...ids.values()];
    for (let start = 0; start < uniqueIds.length; start += GRAPH_BATCH_SIZE) {
      batches.push({ network, ids: uniqueIds.slice(start, start + GRAPH_BATCH_SIZE) });
    }
  }

  await Promise.all(
    batches.map(async ({ network, ids }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);
      try {
        const atoms = await fetchAtoms(network, ids, controller.signal);
        const requested = new Set(ids.map((id) => id.toLowerCase()));
        for (const atom of atoms) {
          if (!requested.has(atom.term_id.toLowerCase())) continue;
          const mapped = mapGraphAtom(atom);
          if (mapped) details.set(graphKey(network, atom.term_id), mapped);
        }
      } catch (error) {
        console.warn(`[activity-items] ${network} graph details unavailable.`, error);
        for (const id of ids) failedIds.add(graphKey(network, id));
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  return items.map((item) => {
    const get = (id: string | null) => (id ? details.get(graphKey(item.network, id)) ?? null : null);
    const reason = itemIds(item).some((id) => failedIds.has(graphKey(item.network, id)))
      ? 'unavailable'
      : 'pending';

    if (item.kind === 'atom') {
      const atom = get(item.protocolId);
      return { ...item, display: atom ? { state: 'ready', atom } : { state: reason } };
    }

    const triple = {
      subject: get(item.subjectId),
      predicate: get(item.predicateId),
      object: get(item.objectId),
    };
    const found = [triple.subject, triple.predicate, triple.object].filter(Boolean).length;
    if (found === 0) return { ...item, display: { state: reason } };
    if (found === 3) return { ...item, display: { state: 'ready', triple } };
    return { ...item, display: { state: 'partial', triple, reason } };
  });
}
