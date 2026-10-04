import { queryIntuitionGraph } from '@/lib/intuition/graph';
import { GRAPH_ATOM_FIELDS, mapGraphAtom, type GraphAtom } from '@/lib/intuition/graph-atoms';
import { isGraphTermId, type GraphDetailRoute } from '@/lib/intuition/graph-detail-route';
import type { ActivityAtomDetails } from '@/types/activity';
import type { PublicIntuitionNetwork } from '@/types/api';

export interface GraphAtomComponent extends ActivityAtomDetails {
  termId: string;
}

export type GraphDetail =
  | {
      kind: 'atom';
      atom: ActivityAtomDetails;
      creatorLabel: string | null;
      createdAt: string | null;
    }
  | {
      kind: 'triple';
      subject: GraphAtomComponent | null;
      predicate: GraphAtomComponent | null;
      object: GraphAtomComponent | null;
      createdAt: string | null;
    };

export type GraphDetailResult =
  | { state: 'ready'; detail: GraphDetail }
  | { state: 'pending' | 'unavailable' };

interface GraphAtomRecord extends GraphAtom {
  creator?: { label?: string | null } | null;
  created_at?: string | null;
}

interface GraphTripleRecord {
  term_id: string;
  created_at?: string | null;
  subject?: GraphAtom | null;
  predicate?: GraphAtom | null;
  object?: GraphAtom | null;
}

const ATOM_DETAIL_QUERY = `
  query GraphAtomDetail($id: String!) {
    atom(term_id: $id) {
      ${GRAPH_ATOM_FIELDS}
      creator { label }
      created_at
    }
  }
`;

const TRIPLE_DETAIL_QUERY = `
  query GraphTripleDetail($id: String!) {
    triple(term_id: $id) {
      term_id
      created_at
      subject { ${GRAPH_ATOM_FIELDS} }
      predicate { ${GRAPH_ATOM_FIELDS} }
      object { ${GRAPH_ATOM_FIELDS} }
    }
  }
`;

function graphComponent(atom: GraphAtom | null | undefined): GraphAtomComponent | null {
  if (!atom || !isGraphTermId(atom.term_id)) return null;
  const details = mapGraphAtom(atom);
  return details ? { ...details, termId: atom.term_id.toLowerCase() } : null;
}

export function mapAtomDetail(atom: GraphAtomRecord | null | undefined): GraphDetail | null {
  const details = mapGraphAtom(atom);
  if (!details) return null;
  return {
    kind: 'atom',
    atom: details,
    creatorLabel: atom?.creator?.label?.trim() || null,
    createdAt: atom?.created_at ?? null,
  };
}

export function mapTripleDetail(triple: GraphTripleRecord | null | undefined): GraphDetail | null {
  if (!triple) return null;
  return {
    kind: 'triple',
    subject: graphComponent(triple.subject),
    predicate: graphComponent(triple.predicate),
    object: graphComponent(triple.object),
    createdAt: triple.created_at ?? null,
  };
}

type GraphDetailRequest = (
  network: PublicIntuitionNetwork,
  query: string,
  variables: { id: string },
  signal: AbortSignal,
) => Promise<unknown>;

const defaultRequest: GraphDetailRequest = (network, query, variables, signal) =>
  queryIntuitionGraph<unknown, { id: string }>(network, query, variables, signal);

export async function getGraphDetail(
  route: GraphDetailRoute,
  request: GraphDetailRequest = defaultRequest,
): Promise<GraphDetailResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    if (route.kind === 'atom') {
      const data = await request(route.network, ATOM_DETAIL_QUERY, { id: route.id }, controller.signal) as {
        atom?: GraphAtomRecord | null;
      };
      const detail = mapAtomDetail(data.atom);
      return detail ? { state: 'ready', detail } : { state: 'pending' };
    }

    const data = await request(route.network, TRIPLE_DETAIL_QUERY, { id: route.id }, controller.signal) as {
      triple?: GraphTripleRecord | null;
    };
    const detail = mapTripleDetail(data.triple);
    return detail ? { state: 'ready', detail } : { state: 'pending' };
  } catch (error) {
    console.warn(`[graph-detail] ${route.network} ${route.kind} details unavailable.`, error);
    return { state: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
