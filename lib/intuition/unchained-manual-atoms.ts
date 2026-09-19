import { getClassification, type ClassificationFieldSpec } from '@0xintuition/classifications';

import { createLocalId } from '@/lib/utils/ids';
import { parseOptionalSupport } from '@/lib/utils/validation';
import type { UnchainedAtomParseRow, UnchainedManualAtomDraft } from '@/types/atoms';

export const DEFAULT_UNCHAINED_CLASSIFICATION = 'thing';

export function createUnchainedManualAtomDraft(classification = DEFAULT_UNCHAINED_CLASSIFICATION): UnchainedManualAtomDraft {
  return {
    id: createLocalId('unchained-atom'),
    classification,
    fieldValues: {},
    deposit: '',
  };
}

function parseFieldInput(field: ClassificationFieldSpec, input: string): unknown {
  const value = input.trim();
  if (field.fieldType === 'string[]') {
    return value.split(/\r?\n|\|/).map((part) => part.trim()).filter(Boolean);
  }
  if (field.fieldType === 'number' || field.fieldType === 'integer') return Number(value);
  if (field.fieldType === 'iso-datetime') return new Date(value).toISOString();
  return value;
}

export function prepareUnchainedManualAtom(draft: UnchainedManualAtomDraft): UnchainedAtomParseRow {
  const spec = getClassification(draft.classification);
  const errors: string[] = [];
  const values: Record<string, unknown> = {};

  if (!spec) {
    errors.push('Choose a valid Unchained atom type.');
  } else {
    for (const field of spec.fields) {
      const input = draft.fieldValues[field.key]?.trim() ?? '';
      if (!input) continue;

      try {
        const value = parseFieldInput(field, input);
        values[field.key] = value;

        if (field.fieldType === 'url' && !input.startsWith('https://')) {
          errors.push(`${field.label} must be a public HTTPS URL.`);
        }
        if (field.key === 'sameAs' && Array.isArray(value) && value.some((item) => typeof item !== 'string' || !item.startsWith('https://'))) {
          errors.push(`${field.label} entries must be public HTTPS URLs.`);
        }
        if ((field.fieldType === 'number' || field.fieldType === 'integer') && !Number.isFinite(value)) {
          errors.push(`${field.label} must be a number.`);
        }
        if (field.fieldType === 'integer' && !Number.isInteger(value)) {
          errors.push(`${field.label} must be a whole number.`);
        }
      } catch {
        errors.push(`${field.label} has an invalid value.`);
      }
    }
  }

  if (parseOptionalSupport(draft.deposit) === null) {
    errors.push('Optional support must be a non-negative TRUST amount.');
  }

  return {
    atom: {
      id: draft.id,
      classification: draft.classification,
      values,
      deposit: draft.deposit,
    },
    errors: [...new Set(errors)],
  };
}
