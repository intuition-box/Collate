import type { AdminAppSettings } from '@/types/settings';

export const SETTINGS_SECTION_FIELDS = {
  visibility: ['showActivityInNav', 'showDiscoverInNav'],
  limits: ['atomLimit', 'listLimit', 'privilegedLimit'],
  allowlist: ['allowlistedWallets'],
} as const;

export type SettingsSection = keyof typeof SETTINGS_SECTION_FIELDS;

export interface SettingsSectionPatch {
  section: SettingsSection;
  values: Partial<AdminAppSettings>;
}

export function pickSettingsSection(settings: AdminAppSettings, section: SettingsSection): Partial<AdminAppSettings> {
  return Object.fromEntries(SETTINGS_SECTION_FIELDS[section].map((field) => [field, settings[field]]));
}

export function parseSettingsSectionPatch(value: unknown): SettingsSectionPatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a valid settings section.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== 'section' && key !== 'values')
    || typeof body.section !== 'string' || !Object.hasOwn(SETTINGS_SECTION_FIELDS, body.section)) {
    throw new Error('Choose a valid settings section.');
  }

  const section = body.section as SettingsSection;
  const values = body.values;
  const fields = SETTINGS_SECTION_FIELDS[section] as readonly string[];
  if (!values || typeof values !== 'object' || Array.isArray(values)
    || Object.keys(values).length !== fields.length
    || fields.some((field) => !Object.hasOwn(values, field))) {
    throw new Error('Provide only the fields for this settings section.');
  }
  return { section, values: values as Partial<AdminAppSettings> };
}

export function isSettingsSectionDirty(draft: AdminAppSettings, saved: AdminAppSettings, section: SettingsSection): boolean {
  return SETTINGS_SECTION_FIELDS[section].some((field) => {
    const draftValue = draft[field];
    const savedValue = saved[field];
    return Array.isArray(draftValue) && Array.isArray(savedValue)
      ? JSON.stringify(draftValue) !== JSON.stringify(savedValue)
      : !Object.is(draftValue, savedValue);
  });
}

export function mergeSavedSettings(
  draft: AdminAppSettings,
  previousSaved: AdminAppSettings,
  nextSaved: AdminAppSettings,
  savedSection: SettingsSection,
): AdminAppSettings {
  const merged = { ...nextSaved };
  for (const section of Object.keys(SETTINGS_SECTION_FIELDS) as SettingsSection[]) {
    if (section !== savedSection && isSettingsSectionDirty(draft, previousSaved, section)) {
      Object.assign(merged, pickSettingsSection(draft, section));
    }
  }
  return merged;
}
