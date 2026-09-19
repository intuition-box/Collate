import { buildAtom } from '@0xintuition/primitives/atom';
import { stringToHex, type Hex, type PublicClient } from 'viem';

import { getUnchainedAtomDisplayName } from '@/lib/csv/unchained-atom-csv';
import { MULTIVAULT_ABI } from '@/lib/intuition/abi';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { searchAtoms } from '@/lib/intuition/search';
import { parseOptionalSupport } from '@/lib/utils/validation';
import type { IntuitionAtomSearchResult, PublicIntuitionNetwork } from '@/types/api';
import type {
  PreparedAtomDraft,
  UnchainedAtomDraft,
  UnchainedAtomParseRow,
  UnchainedAtomReviewRow,
} from '@/types/atoms';

type MatchLookup = (network: PublicIntuitionNetwork, name: string) => Promise<IntuitionAtomSearchResult[]>;

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function invalidRow(draft: UnchainedAtomDraft, errors: string[]): UnchainedAtomReviewRow {
  return {
    id: draft.id,
    label: getUnchainedAtomDisplayName(draft.values),
    status: 'invalid',
    message: errors.join(' '),
    payload: { draft, errors },
  };
}

async function defaultLookup(network: PublicIntuitionNetwork, name: string): Promise<IntuitionAtomSearchResult[]> {
  return searchAtoms(network, name, true, 12);
}

export async function reviewUnchainedAtoms({
  rows,
  network,
  publicClient,
  approvedMatchIds = new Set(),
  lookupMatches = defaultLookup,
}: {
  rows: UnchainedAtomParseRow[];
  network: PublicIntuitionNetwork;
  publicClient: PublicClient;
  approvedMatchIds?: Set<string>;
  lookupMatches?: MatchLookup;
}): Promise<UnchainedAtomReviewRow[]> {
  const contract = getIntuitionNetwork(network).multiVault;
  if (rows.every((row) => row.errors.length > 0)) {
    return rows.map((row) => invalidRow(row.atom, row.errors));
  }

  const cost = (await publicClient.readContract({
    address: contract,
    abi: MULTIVAULT_ABI,
    functionName: 'getAtomCost',
  })) as bigint;

  const prepareRow = async ({ atom, errors }: UnchainedAtomParseRow): Promise<{
    draft: UnchainedAtomDraft;
    errors: string[];
    prepared: PreparedAtomDraft | null;
  }> => {
    if (errors.length) return { draft: atom, errors, prepared: null };

    const built = buildAtom(atom.classification, atom.values);
    if (!built.success) return { draft: atom, errors: built.errors, prepared: null };

    const chainId = (await publicClient.readContract({
      address: contract,
      abi: MULTIVAULT_ABI,
      functionName: 'calculateAtomId',
      args: [stringToHex(built.value.data)],
    })) as Hex;

    if (chainId.toLowerCase() !== built.value.id.toLowerCase()) {
      throw new Error('The Unchained atom ID does not match this network. Publishing has been stopped.');
    }

    const existsOnChain = (await publicClient.readContract({
      address: contract,
      abi: MULTIVAULT_ABI,
      functionName: 'isTermCreated',
      args: [chainId],
    })) as boolean;

    const supportWei = parseOptionalSupport(atom.deposit);
    if (supportWei === null) return { draft: atom, errors: ['deposit must be a non-negative TRUST amount.'], prepared: null };

    const result: PreparedAtomDraft = {
      id: atom.id,
      displayName: getUnchainedAtomDisplayName(atom.values),
      dataString: built.value.data,
      atomId: chainId,
      assetWei: cost + supportWei,
      supportWei,
      existsOnChain,
    };

    return { draft: atom, errors: [] as string[], prepared: result };
  };

  const prepared: Awaited<ReturnType<typeof prepareRow>>[] = [];
  for (let index = 0; index < rows.length; index += 5) {
    prepared.push(...await Promise.all(rows.slice(index, index + 5).map(prepareRow)));
  }

  const counts = new Map<string, number>();
  for (const item of prepared) {
    if (!item.prepared) continue;
    const key = item.prepared.atomId.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const names = [...new Set(prepared
    .filter((item) => item.prepared && !item.prepared.existsOnChain)
    .map((item) => normalizedName(item.prepared!.displayName))
    .filter((name) => name && name !== 'untitled atom'))];
  const matches = new Map<string, IntuitionAtomSearchResult[]>();

  for (let index = 0; index < names.length; index += 5) {
    await Promise.all(names.slice(index, index + 5).map(async (name) => {
      const results = await lookupMatches(network, name);
      matches.set(name, results.filter((atom) => normalizedName(atom.label) === name));
    }));
  }

  return prepared.map(({ draft, errors, prepared: atom }) => {
    if (!atom) return invalidRow(draft, errors);

    const sameNameMatches = (matches.get(normalizedName(atom.displayName)) ?? [])
      .filter((match) => match.termId.toLowerCase() !== atom.atomId.toLowerCase());
    const payload = { draft, prepared: atom, matches: sameNameMatches };

    if (atom.existsOnChain) {
      return { id: draft.id, label: atom.displayName, status: 'existing', message: 'This exact atom already exists on-chain.', payload };
    }

    if ((counts.get(atom.atomId.toLowerCase()) ?? 0) > 1) {
      return { id: draft.id, label: atom.displayName, status: 'blocked_duplicate', message: 'The same canonical atom appears more than once in this batch.', payload };
    }

    if (sameNameMatches.length && !approvedMatchIds.has(draft.id)) {
      return { id: draft.id, label: atom.displayName, status: 'ambiguous', message: 'Atoms with this name already exist. Compare them before creating another.', payload };
    }

    return {
      id: draft.id,
      label: atom.displayName,
      status: 'ready_to_create',
      message: sameNameMatches.length
        ? 'You reviewed the same-name atoms and chose to create this distinct atom.'
        : 'This canonical atom is ready to create.',
      payload,
    };
  });
}

export const reviewUnchainedCsvAtoms = reviewUnchainedAtoms;

export function getCreatableUnchainedAtoms(rows: UnchainedAtomReviewRow[]): PreparedAtomDraft[] {
  return rows
    .filter((row) => row.status === 'ready_to_create' && row.payload.prepared)
    .map((row) => row.payload.prepared as PreparedAtomDraft);
}
