import { getDatabasePool } from '@/lib/database/pool';
import type { PublicAppSettings } from '@/types/settings';

export const DEFAULT_PUBLIC_SETTINGS: PublicAppSettings = {
  showActivityInNav: false,
};

const SHOW_ACTIVITY_KEY = 'show_activity_in_nav';

export async function getPublicSettings(): Promise<PublicAppSettings> {
  const result = await getDatabasePool().query<{ value: unknown }>(
    'SELECT value FROM collate_app_settings WHERE key = $1',
    [SHOW_ACTIVITY_KEY],
  );

  return {
    showActivityInNav:
      typeof result.rows[0]?.value === 'boolean'
        ? result.rows[0].value
        : DEFAULT_PUBLIC_SETTINGS.showActivityInNav,
  };
}

export async function updatePublicSettings(settings: PublicAppSettings): Promise<PublicAppSettings> {
  await getDatabasePool().query(
    `INSERT INTO collate_app_settings (key, value, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [SHOW_ACTIVITY_KEY, JSON.stringify(settings.showActivityInNav)],
  );

  return getPublicSettings();
}
