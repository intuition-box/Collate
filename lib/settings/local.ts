import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DEFAULT_ADMIN_SETTINGS, validateAdminSettings } from '@/lib/settings/creation-limits';
import type { AdminAppSettings } from '@/types/settings';

const LOCAL_SETTINGS_FILE = '.collate-local-settings.json';

export function shouldUseLocalSettings(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL?.trim();
}

function localSettingsPath(): string {
  return join(process.cwd(), LOCAL_SETTINGS_FILE);
}

export async function readLocalSettings(): Promise<AdminAppSettings> {
  try {
    return validateAdminSettings(JSON.parse(await readFile(localSettingsPath(), 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...DEFAULT_ADMIN_SETTINGS, allowlistedWallets: [] };
    }
    throw error;
  }
}

export async function writeLocalSettings(settings: AdminAppSettings): Promise<AdminAppSettings> {
  const validated = validateAdminSettings(settings);
  const target = localSettingsPath();
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(validated, null, 2), { mode: 0o600 });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return validated;
}
