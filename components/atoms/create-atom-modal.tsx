'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAddress, type Hex } from 'viem';
import { useAccount, useChainId, useWalletClient } from 'wagmi';

import { useSelectedNetwork } from '@/components/app/network-provider';
import { AtomDraftRowEditor } from '@/components/atoms/atom-draft-row-editor';
import { createEmptyAtomDraft } from '@/lib/intuition/atom-prepare';
import { mapPreparedAtomToSearchResult } from '@/lib/intuition/atom-search-result';
import { createSingleAtom } from '@/lib/intuition/manual-batch-atoms';
import { getIntuitionNetwork, getIntuitionNetworkByChainId } from '@/lib/intuition/networks';
import { createIntuitionPublicClient } from '@/lib/intuition/public-client';
import { createLocalId } from '@/lib/utils/ids';
import type { AtomDraft } from '@/types/atoms';
import type { IntuitionAtomSearchResult } from '@/types/api';

function createModalDraft(seed: string): AtomDraft {
  return {
    ...createEmptyAtomDraft(createLocalId('create-atom-modal')),
    name: seed,
  };
}

export function CreateAtomModal({
  seed,
  contextLabel = 'member atom',
  eyebrow = 'Create member atom',
  title = 'Create a missing atom without leaving this flow.',
  description = 'Fill in the atom details, create it on Intuition, and this member row will be updated automatically.',
  helperText = 'Start with the typed label and adjust the metadata before publishing.',
  createdStatus = 'Atom created. Adding it to the member row now.',
  onClose,
  onCreated,
}: {
  seed: string;
  contextLabel?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  helperText?: string;
  createdStatus?: string;
  onClose: () => void;
  onCreated: (atom: IntuitionAtomSearchResult) => void;
}) {
  const { network } = useSelectedNetwork();
  const { address, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const networkConfig = getIntuitionNetwork(network);
  const publicClient = useMemo(() => createIntuitionPublicClient(network), [network]);
  const walletNetworkConfig = getIntuitionNetworkByChainId(chainId ?? null);
  const walletReady = accountStatus === 'connected' && !!address;
  const hasNetworkMismatch = walletReady && walletNetworkConfig !== null && walletNetworkConfig?.key !== network;
  const canWrite = walletReady && walletNetworkConfig?.key === network && !!walletClient && !!address;

  const [draft, setDraft] = useState<AtomDraft>(() => createModalDraft(seed));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setDraft((current) => {
      const nextDraft = createModalDraft(seed);
      nextDraft.schemaType = current.schemaType;
      nextDraft.description = current.description;
      nextDraft.url = current.url;
      nextDraft.image = current.image;
      nextDraft.email = current.email;
      nextDraft.identifier = current.identifier;
      nextDraft.accountChainId = current.accountChainId;
      nextDraft.accountAddress = current.accountAddress;
      nextDraft.rawData = current.rawData;
      nextDraft.support = current.support;
      return nextDraft;
    });
    setStatus(null);
    setError(null);
  }, [seed]);

  async function handleCreate() {
    if (!canWrite || !walletClient || !address) {
      setError(
        hasNetworkMismatch
          ? `Switch your wallet to ${networkConfig.name} before creating this atom.`
          : `Connect a wallet on ${networkConfig.name} before creating this atom.`,
      );
      return;
    }

    setIsCreating(true);
    setError(null);
    setStatus('Waiting for wallet approval to create this atom...');

    try {
      const { prepared, writeResult } = await createSingleAtom({
        draft,
        network,
        publicClient,
        walletClient,
        walletAddress: getAddress(address) as Hex,
      });

      const createdAtom = mapPreparedAtomToSearchResult(draft, prepared, getAddress(address));
      setStatus(
        writeResult.kind === 'skipped'
          ? `This atom already exists. Using the existing atom as the ${contextLabel}.`
          : createdStatus,
      );
      onCreated(createdAtom);
    } catch (caughtError) {
      setStatus(null);
      setError(caughtError instanceof Error ? caughtError.message : 'Atom creation failed.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(27,18,13,0.42)] p-4">
      <div className="modal-elevation max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[1.65rem] border border-line/80 bg-white">
        <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
          <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-5">
            <div className="space-y-2">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{eyebrow}</p>
              <h2 className="font-serif text-[2rem] leading-none tracking-[-0.05em]">{title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>

          <div className="space-y-5 px-6 py-6">
            <AtomDraftRowEditor
              draft={draft}
              index={0}
              title={contextLabel}
              helperText={helperText}
              hideRemoveButton
              disabled={isCreating}
              onPatch={(patch) => {
                setDraft((current) => ({ ...current, ...patch }));
                setStatus(null);
                setError(null);
              }}
              onRemove={() => undefined}
            />

            <div className="rounded-[1.15rem] border border-line/80 bg-paper/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Create</p>
                  <p className="text-sm leading-7 text-muted">
                    This creates the atom first, then returns you to the list flow with the created atom selected.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleCreate();
                  }}
                  disabled={isCreating}
                  className="inline-flex rounded-full border border-success/40 bg-accentSoft px-5 py-3 text-sm text-successInk transition-colors duration-150 hover:bg-accent/25 disabled:cursor-not-allowed disabled:border-line disabled:bg-paper disabled:text-muted disabled:opacity-60"
                >
                  {isCreating ? 'Creating atom...' : hasNetworkMismatch ? 'Wrong network' : 'Create atom'}
                </button>
              </div>

              {status ? <p className="mt-4 text-sm leading-7 text-muted">{status}</p> : null}
              {error ? <p className="mt-4 text-sm leading-7 text-dangerInk">{error}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
