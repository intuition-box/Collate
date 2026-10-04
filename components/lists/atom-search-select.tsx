'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CreateAtomModal } from '@/components/atoms/create-atom-modal';
import { searchAtoms } from '@/lib/intuition/search';
import { resolveIntuitionImageUrl } from '@/lib/intuition/images';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { normalizeSearchText } from '@/lib/utils/validation';
import type { IntuitionAtomSearchResult, PublicIntuitionNetwork } from '@/types/api';

function AtomSearchResultCard({
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

        <span
          className={
            isSelected
              ? 'inline-flex rounded-full border border-success/40 bg-success/10 px-3 py-1 text-[0.68rem] uppercase tracking-terminal text-successInk'
              : 'inline-flex rounded-full border border-line/80 bg-paper/70 px-3 py-1 text-[0.68rem] uppercase tracking-terminal text-muted'
          }
        >
          {isSelected ? 'Selected' : 'Candidate'}
        </span>
      </div>
    </div>
  );
}

export function AtomSearchSelect({
  label,
  network,
  preferredCreatorAddress,
  selectedAtom,
  query,
  placeholder,
  disabled,
  helperText,
  onQueryChange,
  onSelect,
  onClear,
  allowCreate = false,
  createLabel = 'list atom',
}: {
  label: string;
  network: PublicIntuitionNetwork;
  preferredCreatorAddress?: string | null | undefined;
  selectedAtom: IntuitionAtomSearchResult | null;
  query: string;
  placeholder: string;
  disabled?: boolean | undefined;
  helperText?: string | undefined;
  onQueryChange: (value: string) => void;
  onSelect: (atom: IntuitionAtomSearchResult) => void;
  onClear?: (() => void) | undefined;
  allowCreate?: boolean | undefined;
  createLabel?: string | undefined;
}) {
  const [results, setResults] = useState<IntuitionAtomSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const searchTokenRef = useRef(0);

  const networkConfig = getIntuitionNetwork(network);
  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);

  function handleSelect(atom: IntuitionAtomSearchResult) {
    onSelect(atom);
    setResults([]);
    setError(null);
  }

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return undefined;
    }

    searchTokenRef.current += 1;
    const token = searchTokenRef.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const nextResults = await searchAtoms(network, trimmedQuery, false, 8, preferredCreatorAddress, controller.signal);

        if (token !== searchTokenRef.current) {
          return;
        }

        setResults(nextResults);

        if (nextResults.length === 0) {
          setError(`No matching atoms were found on ${networkConfig.name}.`);
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
  }, [network, networkConfig.name, preferredCreatorAddress, query]);

  const showCreateSuggestion =
    allowCreate &&
    !disabled &&
    !!query.trim() &&
    !isSearching &&
    results.length === 0 &&
    (!selectedAtom || normalizeSearchText(selectedAtom.label) !== normalizedQuery);

  function handleQueryChange(value: string) {
    onQueryChange(value);

    if (selectedAtom && normalizeSearchText(selectedAtom.label) !== normalizeSearchText(value)) {
      setResults([]);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.1rem] border border-line/80 bg-paper/60 p-4">
      <div className="space-y-2">
        <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{label}</p>
        {helperText ? <p className="text-sm leading-7 text-muted">{helperText}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-[16rem] flex-1 rounded-xl border border-line/80 bg-white/80 px-4 py-3 text-sm text-ink outline-none"
        />
        {selectedAtom && onClear ? (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="inline-flex rounded-full border border-line bg-white/75 px-4 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>

      {query.trim() ? <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Searching {networkConfig.name}</p> : null}
      {isSearching ? <p className="text-sm leading-7 text-muted">Searching for matching atoms...</p> : null}

      {selectedAtom ? (
        <div className="space-y-2">
          <p className="text-[0.68rem] uppercase tracking-terminal text-successInk">Chosen {createLabel}</p>
          <AtomSearchResultCard atom={selectedAtom} tone="selected" />
        </div>
      ) : null}

      {showCreateSuggestion ? (
        <div className="rounded-xl border border-dashed border-line/80 bg-white/70 p-4">
          <p className="text-sm leading-7 text-muted">
            No atom matched this search on {networkConfig.name} yet. Create it first, then use it as the {createLabel}.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={disabled}
            className="mt-3 inline-flex rounded-full border border-ink bg-white px-4 py-2 text-sm text-ink transition-colors duration-150 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create "{query.trim()}" as the {createLabel}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm leading-7 text-dangerInk">{error}</p> : null}

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
              <AtomSearchResultCard atom={result} />
            </button>
          ))}
        </div>
      ) : null}

      {showCreateModal ? (
        <CreateAtomModal
          seed={query.trim()}
          contextLabel={createLabel}
          eyebrow={`Create ${createLabel}`}
          title={`Create this atom, then use it as the ${createLabel}.`}
          description="Fill in the atom details, publish it, and this list flow will select the created atom automatically."
          helperText={`Start with the typed label and adjust the metadata before using it as the ${createLabel}.`}
          createdStatus={`Atom created. Selecting it as the ${createLabel} now.`}
          onClose={() => setShowCreateModal(false)}
          onCreated={(atom) => {
            handleSelect(atom);
            setShowCreateModal(false);
          }}
        />
      ) : null}
    </div>
  );
}
