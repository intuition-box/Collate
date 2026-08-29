import { Pool } from 'pg';

const globalForDatabase = globalThis as typeof globalThis & {
  collateDatabasePool?: Pool;
};

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (!globalForDatabase.collateDatabasePool) {
    const pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (error) => {
      console.error('[database] Unexpected idle PostgreSQL client error.', error);
    });

    globalForDatabase.collateDatabasePool = pool;
  }

  return globalForDatabase.collateDatabasePool;
}
