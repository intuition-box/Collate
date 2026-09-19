'use client';

import { OptionPicker, type PickerOption } from '@/components/app/option-picker';
import { UNCHAINED_CLASSIFICATIONS } from '@/lib/csv/unchained-atom-templates';

export const UNCHAINED_CLASSIFICATION_OPTIONS: PickerOption[] = UNCHAINED_CLASSIFICATIONS.map((item, index) => ({
  value: item.slug,
  label: item.displayName,
  description: item.description,
  group: item.category,
  number: index + 1,
}));

export function UnchainedClassificationPicker({
  value,
  onChange,
  active = true,
  label = 'Example classification',
  showLabel = true,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  active?: boolean;
  label?: string;
  showLabel?: boolean;
  compact?: boolean;
}) {
  return (
    <OptionPicker
      options={UNCHAINED_CLASSIFICATION_OPTIONS}
      value={value}
      onChange={onChange}
      label={label}
      showLabel={showLabel}
      selectedMeta={!compact}
      compact={compact}
      numbered
      active={active}
    />
  );
}
