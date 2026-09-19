'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PickerOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  number?: number;
};

type PickerPosition = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

const GUTTER = 12;
const MAX_HEIGHT = 520;

function getPickerPosition(trigger: HTMLElement, optionCount: number, searchable: boolean): PickerPosition {
  const rect = trigger.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - GUTTER * 2;
  const above = rect.top - GUTTER * 2;
  const width = Math.min(Math.max(rect.width, searchable ? 320 : 220), window.innerWidth - GUTTER * 2);

  if (Math.max(below, above) < 220) {
    return {
      top: GUTTER,
      left: GUTTER,
      width: window.innerWidth - GUTTER * 2,
      maxHeight: window.innerHeight - GUTTER * 2,
    };
  }

  const desiredHeight = Math.min(MAX_HEIGHT, optionCount * 48 + (searchable ? 120 : 24));
  const openAbove = below < desiredHeight && above > below;
  const maxHeight = Math.min(MAX_HEIGHT, openAbove ? above : below);

  return {
    ...(openAbove ? { bottom: window.innerHeight - rect.top + GUTTER } : { top: rect.bottom + GUTTER }),
    left: Math.min(Math.max(GUTTER, rect.left), window.innerWidth - width - GUTTER),
    width,
    maxHeight,
  };
}

export function OptionPicker({
  options,
  value,
  onChange,
  label,
  showLabel = true,
  selectedMeta = false,
  compact = false,
  numbered = false,
  active = true,
  disabled = false,
}: {
  options: readonly PickerOption[];
  value?: string;
  onChange: (value: string) => void;
  label: string;
  showLabel?: boolean;
  selectedMeta?: boolean;
  compact?: boolean;
  numbered?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PickerPosition | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const searchable = options.length > 8;
  const selected = options.find((item) => item.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingOptions = options.filter((item) =>
    `${item.label} ${item.group ?? ''} ${item.description ?? ''} ${item.value}`.toLowerCase().includes(normalizedQuery),
  );
  const groups = [...new Set(matchingOptions.map((item) => item.group ?? ''))];
  const visibleOptions = groups.flatMap((group) => matchingOptions.filter((item) => (item.group ?? '') === group));

  useEffect(() => {
    if (!active || disabled) setOpen(false);
  }, [active, disabled]);

  useEffect(() => {
    if (!open) return;
    (searchable ? searchRef.current : listRef.current)?.focus();
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    }

    function updatePosition() {
      if (triggerRef.current) setPosition(getPickerPosition(triggerRef.current, options.length, searchable));
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  function showPicker() {
    if (!triggerRef.current || disabled) return;
    setPosition(getPickerPosition(triggerRef.current, options.length, searchable));
    setQuery('');
    setActiveIndex(Math.max(0, visibleOptions.findIndex((item) => item.value === value)));
    setOpen(true);
  }

  function choose(item: PickerOption) {
    onChange(item.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visibleOptions.length) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next = (activeIndex + direction + visibleOptions.length) % visibleOptions.length;
      setActiveIndex(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : visibleOptions.length - 1;
      setActiveIndex(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && visibleOptions[activeIndex]) {
      event.preventDefault();
      choose(visibleOptions[activeIndex]);
    } else if (event.key === 'Tab') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className={compact ? 'w-auto' : 'w-full'}>
      {showLabel ? <span className="mb-2 block text-sm text-muted" id={`${listId}-label`}>{label}</span> : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={showLabel ? undefined : label}
        aria-labelledby={showLabel ? `${listId}-label ${listId}-value` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : showPicker()}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            showPicker();
          }
        }}
        className={`flex items-center justify-between gap-3 border bg-white/75 text-left text-ink outline-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/45 focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60 ${compact ? 'w-auto rounded-full px-3 py-2 text-sm' : 'w-full rounded-xl px-4 py-3'} ${open ? 'border-ink/60' : 'border-line/80'}`}
      >
        <span className="min-w-0" id={`${listId}-value`}>
          <span className={`${compact ? '' : 'block truncate text-sm'} ${selectedMeta ? 'font-semibold' : ''}`}>{selected?.label ?? label}</span>
          {selectedMeta && selected?.group ? <span className="block truncate text-xs text-muted">{selected.group}</span> : null}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'rotate-180' : ''}`}>
          <path d="m4 7 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && position ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className="modal-elevation fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-line bg-paper text-ink"
          style={position}
        >
          {searchable ? (
            <div className="shrink-0 p-3">
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                aria-label={`Search ${label.toLowerCase()}`}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded="true"
                aria-activedescendant={visibleOptions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                  listRef.current?.scrollTo({ top: 0 });
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${options.length} types...`}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          ) : null}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={!searchable && visibleOptions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            tabIndex={searchable ? -1 : 0}
            onKeyDown={searchable ? undefined : handleKeyDown}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 outline-none"
          >
            {visibleOptions.length ? groups.map((group) => (
              <div key={group}>
                {group ? <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-terminal text-muted">{group}</p> : null}
                {visibleOptions.filter((item) => (item.group ?? '') === group).map((item) => {
                  const index = visibleOptions.indexOf(item);
                  const isSelected = item.value === value;
                  return (
                    <button
                      key={item.value}
                      id={`${listId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(item)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left outline-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isSelected ? 'bg-accent-soft text-ink' : activeIndex === index ? 'bg-white text-ink' : 'text-ink hover:bg-white'}`}
                    >
                      {numbered && item.number ? <span className="w-6 shrink-0 font-mono text-xs text-muted">{String(item.number).padStart(2, '0')}</span> : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        {item.description ? <span className="block truncate text-xs leading-4 text-muted">{item.description}</span> : null}
                      </span>
                      {isSelected ? <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
                    </button>
                  );
                })}
              </div>
            )) : <p className="px-3 py-6 text-center text-sm text-muted">No matching types. Try another search.</p>}
          </div>
          {searchable ? <p className="shrink-0 border-t border-line/80 px-4 py-2 text-xs text-muted">Arrow keys to browse, Enter to choose, Esc to close.</p> : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
