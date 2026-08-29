import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Pool } = pg;
const MIGRATION_LOCK_NAME = 'collate-database-migrations';
const migrationsDirectory = fileURLToPath(new URL('../database/migrations/', import.meta.url));

function checksum(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run database migrations.');
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  let client;
  let lockAcquired = false;

  try {
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_NAME]);
    lockAcquired = true;
    await client.query(`CREATE TABLE IF NOT EXISTS collate_schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right));

    for (const file of files) {
      const sql = await readFile(join(migrationsDirectory, file), 'utf8');
      const migrationChecksum = checksum(sql);
      const existing = await client.query(
        'SELECT checksum FROM collate_schema_migrations WHERE name = $1',
        [file],
      );

      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== migrationChecksum) {
          throw new Error(`Migration ${file} has changed since it was applied.`);
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO collate_schema_migrations (name, checksum) VALUES ($1, $2)',
          [file, migrationChecksum],
        );
        await client.query('COMMIT');
        console.log(`[database] Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('[database] Migrations are up to date.');
  } finally {
    if (client) {
      try {
        if (lockAcquired) {
          await client.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK_NAME]);
        }
      } finally {
        client.release();
      }
    }
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('[database] Migration failed.', error);
  process.exitCode = 1;
});
