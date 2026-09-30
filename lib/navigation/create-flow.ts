export const CREATE_FLOW_IDS = [
  'single-atom',
  'batch-atoms',
  'csv-atoms',
  'manual-lists',
  'csv-lists',
] as const;

export type CreateFlowId = (typeof CREATE_FLOW_IDS)[number];
export type WorkspaceSection = 'atoms' | 'lists';
export type AtomMode = 'single_atom' | 'batch_atoms' | 'csv_atoms';
export type ListMode = 'manual_lists' | 'csv_lists';

export type CreateWorkspaceState = {
  section: WorkspaceSection;
  atomMode: AtomMode;
  listMode: ListMode;
};

export const DEFAULT_CREATE_FLOW: CreateFlowId = 'single-atom';

export function parseCreateFlow(value: string | string[] | undefined): CreateFlowId {
  const candidate = Array.isArray(value) ? value[0] : value;

  return CREATE_FLOW_IDS.includes(candidate as CreateFlowId)
    ? (candidate as CreateFlowId)
    : DEFAULT_CREATE_FLOW;
}

export function getCreateFlowHref(flow: CreateFlowId): `/create?flow=${CreateFlowId}` {
  return `/create?flow=${flow}`;
}

export function getCreateWorkspaceState(flow: CreateFlowId): CreateWorkspaceState {
  if (flow === 'batch-atoms') return { section: 'atoms', atomMode: 'batch_atoms', listMode: 'manual_lists' };
  if (flow === 'csv-atoms') return { section: 'atoms', atomMode: 'csv_atoms', listMode: 'manual_lists' };
  if (flow === 'manual-lists') return { section: 'lists', atomMode: 'single_atom', listMode: 'manual_lists' };
  if (flow === 'csv-lists') return { section: 'lists', atomMode: 'single_atom', listMode: 'csv_lists' };
  return { section: 'atoms', atomMode: 'single_atom', listMode: 'manual_lists' };
}
