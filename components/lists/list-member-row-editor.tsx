'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CreateAtomModal } from '@/components/atoms/create-atom-modal';
import { ErrorNotice } from '@/components/app/error-notice';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { searchAtoms } from '@/lib/intuition/search';
import { normalizeSearchText } from '@/lib/utils/validation';
import type { IntuitionAtomSearchResult, PublicIntuitionNetwork } from '@/types/api';
import type { ListMemberRow } from '@/types/lists';

function AtomResultCard({
  atom,
  tone = 'default',
}: {
  atom: IntuitionAtomSearchResult;
  tone?: 'default' | 'selected';
}) {
  const imageUrl = resolveIntuitionImageUrl(atom.image);
  const isSelected = tone === 'selected';

  return (
    <div
      className={
        isSelected
          ? 'rounded-xl border border-success/40 bg-accentSoft p-4'
          : 'rounded-xl border border-line/80 bg-white/72 p-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className={`h-12 w-12 rounded-lg object-cover ${isSelected ? 'border border-success/40' : 'border border-line/70'}`}
            />
          ) : null}
          <div className="space-y-1">
            <p className={`text-sm text-ink ${isSelected ? 'font-medium' : ''}`}>{atom.label}</p>
            <p className="text-[0.72rem] leading-5 text-muted">
              {atom.type} · {atom.positionCount} positions
            </p>
            {atom.description ? <p className="text-[0.78rem] leading-6 text-muted">{atom.description}</p> : null}
            <p className="break-all font-mono text-[0.72rem] leading-5 text-muted">{atom.termId}</p>
          </div>
        </div>

        {isSelected ? (
          <span className="inline-flex rounded-full border border-success/40 bg-success/10 px-3 py-1 text-[0.68rem] uppercase tracking-terminal text-successInk">
            Selected
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-line/80 bg-paper/70 px-3 py-1 text-[0.68rem] uppercase tracking-terminal text-muted">
            Candidate
          </span>
        )}
      </div>
    </div>
  );
}

export function ListMemberRowEditor({
  row,
  index,
  network,
  preferredCreatorAddress,
  disabled,
  onPatch,
  onRemove,
}: {
  row: ListMemberRow;
  index: number;
  network: PublicIntuitionNetwork;
  preferredCreatorAddress?: string | null;
  disabled?: boolean;
  onPatch: (patch: Partial<ListMemberRow>) => void;
  onRemove: () => void;
}) {
  const [results, setResults] = useState<IntuitionAtomSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [exactMatch, setExactMatch] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const searchTokenRef = useRef(0);

  const networkConfig = getIntuitionNetwork(network);
  const normalizedQuery = useMemo(() => normalizeSearchText(row.memberName), [row.memberName]);

  function handleSelect(atom: IntuitionAtomSearchResult) {
    onPatch({
      memberName: atom.label,
      selectedAtom: atom,
      candidates: [],
    });
  }

  useEffect(() => {
    const query = row.memberName.trim();

    if (!query) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    searchTokenRef.current += 1;
    const token = searchTokenRef.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const nextResults = await searchAtoms(network, query, exactMatch, 8, preferredCreatorAddress, controller.signal);

        if (token !== searchTokenRef.current) {
          return;
        }

        setResults(nextResults);

        const singleResult = nextResults[0];
        const exactSingleMatch =
          exactMatch && !!singleResult && nextResults.length === 1 && normalizeSearchText(singleResult.label) === normalizeSearchText(query);

        if (exactSingleMatch) {
          if (row.selectedAtom?.termId !== singleResult.termId) {
            handleSelect(singleResult);
          }
          setError(null);
          return;
        }

        if (nextResults.length === 0) {
          setError(exactMatch ? `No atom matched this exact search on ${networkConfig.name} yet.` : 'No matching atoms were found.');
          return;
        }

        if (exactMatch) {
          setError(
            nextResults.length === 1
              ? null
              : `${nextResults.length} exact matches were found. Pick the right atom before reviewing the list entry.`,
          );
          return;
        }

        setError(null);
      } catch (caughtError) {
        if (controller.signal.aborted || token !== searchTokenRef.current) {
          return;
        }

        setResults([]);
        setError(caughtError instanceof Error ? caughtError.message : 'Atom search failed.');
      } finally {
        if (token === searchTokenRef.current) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [exactMatch, network, networkConfig.name, preferredCreatorAddress, row.memberName, row.selectedAtom?.termId]);

  const showCreateSuggestion =
    !disabled &&
    !!row.memberName.trim() &&
    !isSearching &&
    results.length === 0 &&
    (!row.selectedAtom || normalizeSearchText(row.selectedAtom.label) !== normalizedQuery);

  return (
    <>
      <div className="rounded-[1.15rem] border border-line/80 bg-paper/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Member {index + 1}</p>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex rounded-full border border-line bg-white/75 px-3 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        </div>

        <div className="space-y-3 rounded-[1.1rem] border border-line/80 bg-paper/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Member atom</p>
              <p className="text-sm leading-7 text-muted">Start typing to search Intuition instantly, then select the exact atom you want to add.</p>
              <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Searching {networkConfig.name}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                disabled={disabled || !row.memberName.trim()}
                className="inline-flex rounded-full border border-line bg-white/85 px-4 py-2 text-sm text-ink transition-colors duration-150 hover:border-ink/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create atom
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={exactMatch}
                  disabled={disabled}
                  onChange={(event) => {
                    setExactMatch(event.target.checked);
                    onPatch({
                      selectedAtom:
                        row.selectedAtom && normalizeSearchText(row.selectedAtom.label) === normalizeSearchText(row.memberName)
                          ? row.selectedAtom
                          : null,
                    });
                  }}
                />
                Exact match
              </label>
            </div>
          </div>

          <input
            value={row.memberName}
            onChange={(event) =>
              onPatch({
                memberName: event.target.value,
                selectedAtom:
                  row.selectedAtom && normalizeSearchText(row.selectedAtom.label) === normalizeSearchText(event.target.value)
                    ? row.selectedAtom
                    : null,
              })
            }
            disabled={disabled}
            placeholder="Search member atom label"
            className="w-full rounded-xl border border-line/80 bg-white/80 px-4 py-3 text-sm text-ink outline-none"
          />

          {isSearching ? <p className="text-sm leading-7 text-muted">Searching for matching atoms...</p> : null}

          {row.selectedAtom ? (
            <div className="space-y-2">
              <p className="text-[0.68rem] uppercase tracking-terminal text-successInk">Chosen member atom</p>
              <AtomResultCard atom={row.selectedAtom} tone="selected" />
            </div>
          ) : null}

          {showCreateSuggestion ? (
            <div className="rounded-xl border border-dashed border-line/80 bg-white/70 p-4">
              <p className="text-sm leading-7 text-muted">
                {exactMatch
                  ? `No atom matched this exact search on ${networkConfig.name} yet.`
                  : `No matching atoms were found on ${networkConfig.name}.`}
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                disabled={disabled}
                className="mt-3 inline-flex rounded-full border border-ink bg-white px-4 py-2 text-sm text-ink transition-colors duration-150 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create "{row.memberName.trim()}" as the member
              </button>
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[0.68rem] uppercase tracking-terminal text-muted">Search results</p>
              {results.map((result) => (
                <button
                  key={result.termId}
                  type="button"
                  onClick={() => handleSelect(result)}
                  disabled={disabled}
                  className="w-full text-left transition-transform duration-150 hover:translate-y-[-1px]"
                >
                  <AtomResultCard atom={result} />
                </button>
              ))}
            </div>
          ) : null}

          {error ? <ErrorNotice message={error} /> : null}
        </div>
      </div>

      {showCreateModal ? (
        <CreateAtomModal
          seed={row.memberName.trim()}
          onClose={() => setShowCreateModal(false)}
          onCreated={(atom) => {
            handleSelect(atom);
            setResults([]);
            setError(null);
            setShowCreateModal(false);
          }}
        />
      ) : null}
    </>
  );
}
