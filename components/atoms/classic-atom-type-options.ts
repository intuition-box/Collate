import type { PickerOption } from '@/components/app/option-picker';
import type { AtomSchemaType } from '@/types/atoms';

export const CLASSIC_ATOM_TYPE_OPTIONS: (PickerOption & { value: AtomSchemaType })[] = [
  { value: 'Thing', label: 'Thing', description: 'A concept, object, or general entry.' },
  { value: 'Person', label: 'Person', description: 'A person or identity.' },
  { value: 'Organization', label: 'Organization', description: 'A team, company, or group.' },
  { value: 'Account', label: 'Account', description: 'An on-chain account address.' },
  { value: 'Raw', label: 'Raw URI / data', description: 'A URI or raw data value.' },
];
