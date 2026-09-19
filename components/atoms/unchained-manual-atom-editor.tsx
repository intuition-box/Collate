'use client';

import { getClassification, type ClassificationFieldSpec } from '@0xintuition/classifications';

import { UnchainedClassificationPicker } from '@/components/atoms/unchained-classification-picker';
import type { UnchainedManualAtomDraft } from '@/types/atoms';

const LONG_TEXT_FIELDS = new Set(['description', 'text', 'reviewBody', 'caption']);

function inputType(field: ClassificationFieldSpec): 'text' | 'url' | 'number' | 'date' | 'datetime-local' {
  if (field.fieldType === 'url') return 'url';
  if (field.fieldType === 'number' || field.fieldType === 'integer') return 'number';
  if (field.fieldType === 'iso-date') return 'date';
  if (field.fieldType === 'iso-datetime') return 'datetime-local';
  return 'text';
}

export function UnchainedManualAtomEditor({
  draft,
  index,
  active,
  disabled,
  hideRemoveButton,
  onPatch,
  onRemove,
}: {
  draft: UnchainedManualAtomDraft;
  index: number;
  active: boolean;
  disabled: boolean;
  hideRemoveButton: boolean;
  onPatch: (patch: Partial<UnchainedManualAtomDraft>) => void;
  onRemove: () => void;
}) {
  const spec = getClassification(draft.classification);

  function patchField(key: string, value: string) {
    onPatch({ fieldValues: { ...draft.fieldValues, [key]: value } });
  }

  return (
    <div className="rounded-xl border border-line/80 bg-paper/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <p className="text-xs uppercase tracking-terminal text-muted">Atom {index + 1}</p>
          <p className="text-sm leading-6 text-muted">{spec?.description ?? 'Choose an atom type to see its canonical fields.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UnchainedClassificationPicker
            value={draft.classification}
            onChange={(classification) => onPatch({ classification, fieldValues: {} })}
            active={active}
            label={`Type for atom ${index + 1}`}
            showLabel={false}
            compact
          />
          {hideRemoveButton ? null : (
            <button type="button" onClick={onRemove} disabled={disabled} className="rounded-full border border-line bg-white/75 px-3 py-2 text-sm text-muted hover:text-ink disabled:opacity-60">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {spec?.fields.map((field) => {
          const value = draft.fieldValues[field.key] ?? '';
          const isLong = field.fieldType === 'string[]' || LONG_TEXT_FIELDS.has(field.key);
          return (
            <label key={field.key} className={`space-y-2 ${isLong ? 'md:col-span-2' : ''}`}>
              <span className="text-sm text-muted">{field.label}{field.required ? <span className="text-ink"> *</span> : ' (optional)'}</span>
              {isLong ? (
                <textarea
                  value={value}
                  onChange={(event) => patchField(field.key, event.target.value)}
                  disabled={disabled}
                  rows={field.fieldType === 'string[]' ? 3 : 4}
                  placeholder={field.fieldType === 'string[]' ? 'One public HTTPS URL per line' : field.placeholder}
                  className="w-full resize-y rounded-xl border border-line/80 bg-white/75 px-4 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                />
              ) : (
                <input
                  type={inputType(field)}
                  value={value}
                  onChange={(event) => patchField(field.key, event.target.value)}
                  disabled={disabled}
                  required={field.required}
                  step={field.fieldType === 'integer' ? '1' : field.fieldType === 'number' ? 'any' : undefined}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-line/80 bg-white/75 px-4 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                />
              )}
              <span className="block text-xs leading-5 text-muted">{field.description}</span>
            </label>
          );
        })}

        <label className="space-y-2">
          <span className="text-sm text-muted">Initial support (optional)</span>
          <input
            type="number"
            min="0"
            step="any"
            value={draft.deposit}
            onChange={(event) => onPatch({ deposit: event.target.value })}
            disabled={disabled}
            placeholder="0"
            className="w-full rounded-xl border border-line/80 bg-white/75 px-4 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
          />
          <span className="block text-xs leading-5 text-muted">Added to the protocol atom cost without changing the canonical atom identity.</span>
        </label>
      </div>
    </div>
  );
}
