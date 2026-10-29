import { queryIntuitionGraph } from '@/lib/intuition/graph';
import { GRAPH_ATOM_FIELDS, mapGraphAtom, type GraphAtom } from '@/lib/intuition/graph-atoms';
import type { ActivityAtomDetails } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

const GRAPH_BATCH_SIZE = 80;
const GRAPH_CONCURRENCY = 4;
const GRAPH_TIMEOUT_MS = 4000;

const DISCOVER_ATOMS_QUERY = `
  query DiscoverAtoms($ids: [String!]!, $limit: Int!) {
    atoms(where: { term_id: { _in: $ids } }, limit: $limit) {
      ${GRAPH_ATOM_FIELDS}
    }
  }
`;

type AtomFetcher = (network: PublicIntuitionNetwork, ids: string[], signal: AbortSignal) => Promise<GraphAtom[]>;

const fetchAtoms: AtomFetcher = async (network, ids, signal) => {
  const response = await queryIntuitionGraph<{ atoms: GraphAtom[] }, { ids: string[]; limit: number }>(
    network, DISCOVER_ATOMS_QUERY, { ids, limit: ids.length }, signal,
  );
  return response.atoms;
};

export async function getDiscoverAtomMetadata(
  network: PublicIntuitionNetwork,
  ids: string[],
  fetcher: AtomFetcher = fetchAtoms,
): Promise<{ details: Map<string, ActivityAtomDetails>; failedIds: Set<string> }> {
  const uniqueIds = [...new Map(ids.map((id) => [id.toLowerCase(), id])).values()];
  const details = new Map<string, ActivityAtomDetails>();
  const failedIds = new Set<string>();
  const batches: string[][] = [];
  for (let start = 0; start < uniqueIds.length; start += GRAPH_BATCH_SIZE) batches.push(uniqueIds.slice(start, start + GRAPH_BATCH_SIZE));

  let nextBatch = 0;
  await Promise.all(Array.from({ length: Math.min(GRAPH_CONCURRENCY, batches.length) }, async () => {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      if (!batch) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);
      try {
        const atoms = await fetcher(network, batch, controller.signal);
        const requested = new Set(batch.map((id) => id.toLowerCase()));
        for (const atom of atoms) {
          if (!requested.has(atom.term_id.toLowerCase())) continue;
          const mapped = mapGraphAtom(atom);
          if (mapped) details.set(atom.term_id.toLowerCase(), mapped);
        }
      } catch (error) {
        console.warn(`[discover] ${network} graph metadata unavailable.`, error);
        for (const id of batch) failedIds.add(id.toLowerCase());
      } finally {
        clearTimeout(timeout);
      }
    }
  }));

  return { details, failedIds };
}
