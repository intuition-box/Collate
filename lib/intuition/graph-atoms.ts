import type { ActivityAtomDetails } from '@/types/activity';

export const GRAPH_ATOM_FIELDS = `
  term_id
  label
  type
  image
  value {
    thing { description image url }
    person { description image url }
    organization { description image url }
  }
`;

interface GraphValue {
  description?: string | null;
  image?: string | null;
  url?: string | null;
}

export interface GraphAtom {
  term_id: string;
  label: string | null;
  type: string | null;
  image?: string | null;
  value?: {
    thing?: GraphValue | null;
    person?: GraphValue | null;
    organization?: GraphValue | null;
  } | null;
}

function normalized(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export function mapGraphAtom(atom: GraphAtom | null | undefined): ActivityAtomDetails | null {
  if (!atom) return null;
  const label = normalized(atom.label);
  if (!label) return null;

  const value = atom.value?.thing ?? atom.value?.person ?? atom.value?.organization;
  return {
    label,
    type: normalized(atom.type),
    image: normalized(value?.image) ?? normalized(atom.image),
    description: normalized(value?.description),
    url: normalized(value?.url),
  };
}
