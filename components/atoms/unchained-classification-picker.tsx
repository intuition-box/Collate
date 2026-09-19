'use client';

import { OptionPicker, type PickerOption } from '@/components/app/option-picker';
import { UNCHAINED_CLASSIFICATIONS } from '@/lib/csv/unchained-atom-templates';

const options: PickerOption[] = UNCHAINED_CLASSIFICATIONS.map((item, index) => ({
  value: item.slug,
  label: item.displayName,
  description: item.description,
  group: item.category,
  number: index + 1,
}));

export function UnchainedClassificationPicker({ value, onChange, active = true }: { value: string; onChange: (value: string) => void; active?: boolean }) {
  return (
    <OptionPicker
      options={options}
      value={value}
      onChange={onChange}
      label="Example classification"
      selectedMeta
      numbered
      active={active}
    />
  );
}
