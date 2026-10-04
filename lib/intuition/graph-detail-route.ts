import type { PublicIntuitionNetwork } from '@/types/api';

export type GraphDetailKind = 'atom' | 'triple';

export interface GraphDetailRoute {
  network: PublicIntuitionNetwork;
  kind: GraphDetailKind;
  id: string;
}

export function isGraphTermId(value: string): boolean {
  return /^0x[0-9a-f]{64}$/i.test(value);
}

export function parseGraphDetailRoute(params: { network: string; kind: string; id: string }): GraphDetailRoute | null {
  if (params.network !== 'mainnet' && params.network !== 'testnet') return null;
  if (params.kind !== 'atom' && params.kind !== 'triple') return null;
  if (!isGraphTermId(params.id)) return null;
  return { network: params.network, kind: params.kind, id: params.id.toLowerCase() };
}

export function getGraphDetailHref(network: PublicIntuitionNetwork, kind: GraphDetailKind, id: string): string {
  if (!isGraphTermId(id)) throw new Error('Invalid graph term ID.');
  return `/explore/${network}/${kind}/${id.toLowerCase()}`;
}
