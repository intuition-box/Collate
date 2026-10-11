import { getDatabasePool } from '@/lib/database/pool';
import { DEFAULT_ADMIN_SETTINGS, resolveCreationLimits, validateAdminSettings } from '@/lib/settings/creation-limits';
import type { AdminAppSettings, CreationLimits, PublicAppSettings } from '@/types/settings';

export const DEFAULT_PUBLIC_SETTINGS: PublicAppSettings = {
  showActivityInNav: DEFAULT_ADMIN_SETTINGS.showActivityInNav,
};

const SETTING_KEYS = {
  showActivityInNav: 'show_activity_in_nav',
  atomLimit: 'normal_atom_limit',
  listLimit: 'normal_list_limit',
  privilegedLimit: 'privileged_batch_limit',
  allowlistedWallets: 'batch_allowlisted_wallets',
} as const;

export async function getAdminSettings(): Promise<AdminAppSettings> {
  const result = await getDatabasePool().query<{ key: string; value: unknown }>(
    'SELECT key, value FROM collate_app_settings WHERE key = ANY($1::text[])',
    [Object.values(SETTING_KEYS)],
  );
  const values = new Map(result.rows.map((row) => [row.key, row.value]));
  const candidate = Object.fromEntries(
    Object.entries(SETTING_KEYS).map(([field, key]) => [field, values.get(key) ?? DEFAULT_ADMIN_SETTINGS[field as keyof AdminAppSettings]]),
  );
  return validateAdminSettings(candidate);
}

export async function getPublicSettings(): Promise<PublicAppSettings> {
  const { showActivityInNav } = await getAdminSettings();
  return { showActivityInNav };
}

export async function getEffectiveCreationLimits(address?: string | null): Promise<CreationLimits> {
  return resolveCreationLimits(await getAdminSettings(), address);
}

export async function updateAdminSettings(settings: AdminAppSettings): Promise<AdminAppSettings> {
  const validated = validateAdminSettings(settings);
  const pairs = Object.entries(SETTING_KEYS).map(([field, key]) => [key, JSON.stringify(validated[field as keyof AdminAppSettings])]);
  await getDatabasePool().query(
    `INSERT INTO collate_app_settings (key, value, updated_at)
     SELECT key, value::jsonb, NOW() FROM unnest($1::text[], $2::text[]) AS source(key, value)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [pairs.map(([key]) => key), pairs.map(([, value]) => value)],
  );
  return validated;
}
