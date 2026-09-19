'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

import { OptionPicker } from '@/components/app/option-picker';
import { useSelectedNetwork } from '@/components/app/network-provider';
import { CLASSIC_ATOM_TYPE_OPTIONS } from '@/components/atoms/classic-atom-type-options';
import {
  getImageDataUri,
  resolveIntuitionImageUrl,
  normalizeImageUploadError,
  prepareImageFileForUpload,
  uploadIntuitionImageFromUrl,
  validateAtomImageFile,
} from '@/lib/intuition/images';
import { getIntuitionNetwork } from '@/lib/intuition/networks';
import { searchAtoms } from '@/lib/intuition/search';
import type { AtomDraft, AtomSchemaType } from '@/types/atoms';
import type { IntuitionAtomSearchResult } from '@/types/api';

function isRichSchema(schemaType: AtomSchemaType): boolean {
  return schemaType === 'Thing' || schemaType === 'Person' || schemaType === 'Organization';
}

function getLookupQuery(draft: AtomDraft): string {
  if (isRichSchema(draft.schemaType)) {
    return draft.name.trim();
  }

  if (draft.schemaType === 'Account') {
    return draft.accountAddress.trim();
  }

  return draft.rawData.trim();
}

function getLookupThreshold(schemaType: AtomSchemaType): number {
  if (schemaType === 'Raw') {
    return 4;
  }

  if (schemaType === 'Account') {
    return 6;
  }

  return 2;
}

function shouldUseExactLookup(schemaType: AtomSchemaType): boolean {
  return schemaType === 'Account' || schemaType === 'Raw';
}

function isLikelyExactMatch(result: IntuitionAtomSearchResult, draft: AtomDraft, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return false;
  }

  if (draft.schemaType === 'Account' || draft.schemaType === 'Raw') {
    return (result.data ?? '').trim().toLowerCase() === normalizedQuery;
  }

  return result.label.trim().toLowerCase() === normalizedQuery;
}

export function AtomDraftRowEditor({
  draft,
  index,
  disabled,
  title,
  helperText,
  hideRemoveButton,
  active = true,
  onPatch,
  onRemove,
}: {
  draft: AtomDraft;
  index: number;
  disabled?: boolean;
  title?: string;
  helperText?: string;
  hideRemoveButton?: boolean;
  active?: boolean;
  onPatch: (patch: Partial<AtomDraft>) => void;
  onRemove: () => void;
}) {
  const { network } = useSelectedNetwork();
  const { address } = useAccount();
  const [imageUploadStatus, setImageUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'failed'>('idle');
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<IntuitionAtomSearchResult[]>([]);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'ready' | 'error'>('idle');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const uploadTokenRef = useRef(0);
  const lookupTokenRef = useRef(0);
  const lookupQuery = useMemo(() => getLookupQuery(draft), [draft]);
  const networkName = getIntuitionNetwork(network).name;
  const minimumLookupLength = getLookupThreshold(draft.schemaType);
  const exactLookup = shouldUseExactLookup(draft.schemaType);
  const hasLookupQuery = lookupQuery.length >= minimumLookupLength;
  const imageValue = draft.image.trim();
  const isPreparedLocalImage = imageValue.startsWith('data:image/');
  const imagePreviewUrl = resolveIntuitionImageUrl(imageValue);

  useEffect(() => {
    if (!hasLookupQuery) {
      setLookupResults([]);
      setLookupStatus('idle');
      setLookupError(null);
      return;
    }

    lookupTokenRef.current += 1;
    const lookupToken = lookupTokenRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupStatus('searching');
      setLookupError(null);

      try {
        const results = await searchAtoms(network, lookupQuery, exactLookup, 6, address, controller.signal);

        if (lookupToken !== lookupTokenRef.current) {
          return;
        }

        setLookupResults(results);
        setLookupStatus('ready');
      } catch (caughtError) {
        if (lookupToken !== lookupTokenRef.current) {
          return;
        }

        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
          return;
        }

        setLookupResults([]);
        setLookupStatus('error');
        setLookupError(caughtError instanceof Error ? caughtError.message : 'Existing atom lookup failed.');
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [address, exactLookup, hasLookupQuery, lookupQuery, network]);

  const setSchemaType = (schemaType: AtomSchemaType) => {
    onPatch({
      schemaType,
      ...(isRichSchema(schemaType)
        ? {}
        : {
            name: '',
            description: '',
            url: '',
            image: '',
            email: '',
            identifier: '',
          }),
      ...(schemaType === 'Account'
        ? {}
        : {
            accountChainId: '1',
            accountAddress: '',
          }),
      ...(schemaType === 'Raw'
        ? {}
        : {
            rawData: '',
      }),
    });
  };

  async function handleImageFileChange(file: File | null) {
    if (!file) {
      return;
    }

    uploadTokenRef.current += 1;
    const uploadToken = uploadTokenRef.current;
    const validationError = validateAtomImageFile(file);

    if (validationError) {
      setSelectedImageName(file.name);
      setImageUploadStatus('failed');
      setImageUploadError(validationError);
      return;
    }

    setSelectedImageName(file.name);
    setImageUploadStatus('uploading');
    setImageUploadError(null);

    try {
      const preparedImage = await prepareImageFileForUpload(file);

      if (uploadToken !== uploadTokenRef.current) {
        return;
      }

      onPatch({ image: getImageDataUri(preparedImage) });
      setImageUploadStatus('uploaded');
      setImageUploadError(null);
    } catch (caughtError) {
      if (uploadToken !== uploadTokenRef.current) {
        return;
      }

      setImageUploadStatus('failed');
      setImageUploadError(normalizeImageUploadError(caughtError));
    }
  }

  async function handleImportImageUrl() {
    const imageUrl = draft.image.trim();

    if (!imageUrl) {
      setImageUploadStatus('failed');
      setImageUploadError('Paste a public HTTPS image URL before importing it.');
      return;
    }

    if (!imageUrl.startsWith('https://')) {
      setImageUploadStatus('failed');
      setImageUploadError('Only public HTTPS image URLs can be imported through Intuition.');
      return;
    }

    uploadTokenRef.current += 1;
    const uploadToken = uploadTokenRef.current;
    setSelectedImageName(null);
    setImageUploadStatus('uploading');
    setImageUploadError(null);

    try {
      const uploadedImage = await uploadIntuitionImageFromUrl(network, imageUrl);

      if (uploadToken !== uploadTokenRef.current) {
        return;
      }

      onPatch({ image: uploadedImage.url });
      setImageUploadStatus('uploaded');
      setImageUploadError(uploadedImage.safe === false ? 'Image imported but marked unsafe by moderation.' : null);
    } catch (caughtError) {
      if (uploadToken !== uploadTokenRef.current) {
        return;
      }

      setImageUploadStatus('failed');
      setImageUploadError(normalizeImageUploadError(caughtError));
    }
  }

  return (
    <div className="rounded-[1.15rem] border border-line/80 bg-paper/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.72rem] uppercase tracking-terminal text-muted">{title ?? `Atom ${index + 1}`}</p>
          {helperText ? <p className="text-sm leading-7 text-muted">{helperText}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OptionPicker
            options={CLASSIC_ATOM_TYPE_OPTIONS}
            value={draft.schemaType}
            onChange={(value) => setSchemaType(value as AtomSchemaType)}
            label="Atom type"
            showLabel={false}
            compact
            active={active}
            disabled={!!disabled}
          />
          {hideRemoveButton ? null : (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="inline-flex rounded-full border border-line bg-white/75 px-3 py-2 text-sm text-muted transition-colors duration-150 hover:border-ink/15 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {isRichSchema(draft.schemaType) ? (
          <>
            <label className="space-y-2">
              <span className="text-sm text-muted">Name</span>
              <input
                value={draft.name}
                onChange={(event) => onPatch({ name: event.target.value })}
                disabled={disabled}
                className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">URL (optional)</span>
              <input
                value={draft.url}
                onChange={(event) => onPatch({ url: event.target.value })}
                disabled={disabled}
                placeholder="https://..."
                className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-muted">Description</span>
              <textarea
                value={draft.description}
                onChange={(event) => onPatch({ description: event.target.value })}
                rows={3}
                disabled={disabled}
                className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm leading-7 text-ink outline-none"
              />
            </label>
            <div className="space-y-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted">Image (optional)</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleImportImageUrl();
                    }}
                    disabled={disabled || imageUploadStatus === 'uploading' || isPreparedLocalImage}
                    className="inline-flex rounded-full border border-line bg-white/80 px-3 py-2 text-sm text-ink transition-colors duration-150 hover:border-ink/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {imageUploadStatus === 'uploading' ? 'Working...' : 'Import URL'}
                  </button>
                  <label className="inline-flex cursor-pointer rounded-full border border-line bg-white/80 px-3 py-2 text-sm text-ink transition-colors duration-150 hover:border-ink/15 disabled:cursor-not-allowed disabled:opacity-60">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={disabled || imageUploadStatus === 'uploading'}
                      onChange={(event) => {
                        void handleImageFileChange(event.target.files?.[0] ?? null);
                        event.currentTarget.value = '';
                      }}
                    />
                    {imageUploadStatus === 'uploading' ? 'Uploading image...' : 'Upload image'}
                  </label>
                </div>
              </div>
              {isPreparedLocalImage ? (
                <div className="rounded-xl border border-[#5d8a62]/25 bg-[#edf6ee] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {imagePreviewUrl ? (
                        <img
                          src={imagePreviewUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg border border-[#5d8a62]/20 object-cover"
                        />
                      ) : null}
                      <div className="space-y-1">
                        <p className="text-sm text-[#1f5a2d]">Local image prepared</p>
                        <p className="text-sm leading-6 text-muted">
                          The image will be pinned inside this atom&apos;s metadata during review.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onPatch({ image: '' });
                        setSelectedImageName(null);
                        setImageUploadStatus('idle');
                        setImageUploadError(null);
                      }}
                      disabled={disabled || imageUploadStatus === 'uploading'}
                      className="inline-flex rounded-full border border-[#5d8a62]/30 bg-white/80 px-3 py-2 text-sm text-[#1f5a2d] transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  value={draft.image}
                  onChange={(event) => {
                    onPatch({ image: event.target.value });
                    setImageUploadStatus('idle');
                    setImageUploadError(null);
                  }}
                  disabled={disabled}
                  placeholder="https://... or ipfs://..."
                  className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
                />
              )}
              <div className="space-y-1 text-sm leading-6 text-muted">
                <p>Upload your own image, or paste a public image URL and import it through Intuition.</p>
                <p>Local images are resized and converted to JPG before metadata pinning.</p>
                {selectedImageName ? <p>Selected file: {selectedImageName}</p> : null}
                {imageUploadStatus === 'uploaded' && draft.image.trim() ? (
                  <p className="text-[#1f8a62]">Image prepared and will be pinned with this atom's metadata.</p>
                ) : null}
                {imageUploadError ? <p className="text-[#8a4b38]">{imageUploadError}</p> : null}
              </div>
            </div>
            {(draft.schemaType === 'Person' || draft.schemaType === 'Organization') ? (
              <label className="space-y-2">
                <span className="text-sm text-muted">Email (optional)</span>
                <input
                  value={draft.email}
                  onChange={(event) => onPatch({ email: event.target.value })}
                  disabled={disabled}
                  className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
                />
              </label>
            ) : null}
            {draft.schemaType === 'Person' ? (
              <label className="space-y-2">
                <span className="text-sm text-muted">Identifier (optional)</span>
                <input
                  value={draft.identifier}
                  onChange={(event) => onPatch({ identifier: event.target.value })}
                  disabled={disabled}
                  className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
                />
              </label>
            ) : null}
          </>
        ) : null}

        {draft.schemaType === 'Account' ? (
          <>
            <label className="space-y-2">
              <span className="text-sm text-muted">Account chain ID</span>
              <input
                value={draft.accountChainId}
                onChange={(event) => onPatch({ accountChainId: event.target.value })}
                disabled={disabled}
                className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted">Address</span>
              <input
                value={draft.accountAddress}
                onChange={(event) => onPatch({ accountAddress: event.target.value })}
                disabled={disabled}
                placeholder="0x..."
                className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 font-mono text-sm text-ink outline-none"
              />
            </label>
          </>
        ) : null}

        {draft.schemaType === 'Raw' ? (
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Exact URI or raw data string</span>
            <textarea
              value={draft.rawData}
              onChange={(event) => onPatch({ rawData: event.target.value })}
              rows={3}
              disabled={disabled}
              className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 font-mono text-sm leading-7 text-ink outline-none"
            />
          </label>
        ) : null}

        <label className="space-y-2">
          <span className="text-sm text-muted">Initial support (optional)</span>
          <input
            value={draft.support}
            onChange={(event) => onPatch({ support: event.target.value })}
            disabled={disabled}
            placeholder="0"
            className="w-full rounded-xl border border-line/80 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
          />
        </label>
      </div>

      <div className="mt-5 rounded-[1.1rem] border border-dashed border-line bg-white/55 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted">Existing atom lookup</p>
            <p className="text-[0.72rem] uppercase tracking-terminal text-muted/90">{`Searching ${networkName}`}</p>
          </div>
          <p className="text-[0.72rem] uppercase tracking-terminal text-muted">
            {lookupStatus === 'searching'
              ? 'Searching...'
              : !hasLookupQuery
                ? `Type at least ${minimumLookupLength} characters`
                : lookupResults.length > 0
                  ? `${lookupResults.length} match${lookupResults.length === 1 ? '' : 'es'}`
                  : 'Watching for matches'}
          </p>
        </div>

        <p className="mt-3 text-sm leading-7 text-muted">
          Similar atoms are checked automatically while you type, so creation does not start blind.
        </p>

        {lookupError ? <p className="mt-3 text-sm leading-7 text-[#8a4b38]">{lookupError}</p> : null}

        {!hasLookupQuery ? (
          <p className="mt-3 text-sm leading-7 text-muted">
            Start typing the {draft.schemaType === 'Account' ? 'account address' : draft.schemaType === 'Raw' ? 'raw value' : 'atom name'} to
            check whether it already exists on {networkName}.
          </p>
        ) : null}

        {hasLookupQuery && lookupStatus === 'ready' && lookupResults.length === 0 ? (
          <p className="mt-3 text-sm leading-7 text-muted">
            No existing atoms matched this {draft.schemaType === 'Account' || draft.schemaType === 'Raw' ? 'exact lookup' : 'search'} yet.
          </p>
        ) : null}

        {lookupResults.length > 0 ? (
          <div className="mt-4 space-y-3">
            {lookupResults.map((result) => {
              const previewUrl = resolveIntuitionImageUrl(result.image);
              const likelyExactMatch = isLikelyExactMatch(result, draft, lookupQuery);

              return (
                <div
                  key={result.termId}
                  className={
                    likelyExactMatch
                      ? 'rounded-xl border border-[#5d8a62]/35 bg-[#edf6ee] p-4'
                      : 'rounded-xl border border-line/80 bg-white/80 p-4'
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg border border-line/70 object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-ink">{result.label}</p>
                          <span
                            className={
                              likelyExactMatch
                                ? 'rounded-full border border-[#5d8a62]/25 bg-white/70 px-2 py-1 text-[0.68rem] uppercase tracking-terminal text-[#1f5a2d]'
                                : 'rounded-full border border-line/80 bg-paper/70 px-2 py-1 text-[0.68rem] uppercase tracking-terminal text-muted'
                            }
                          >
                            {likelyExactMatch ? 'Likely existing match' : 'Related atom'}
                          </span>
                        </div>
                        <p className="text-[0.72rem] leading-5 text-muted">
                          {result.type} · {result.positionCount} positions
                        </p>
                        {result.description ? <p className="text-[0.78rem] leading-6 text-muted">{result.description}</p> : null}
                        <p className="break-all font-mono text-[0.72rem] leading-5 text-muted">{result.termId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
