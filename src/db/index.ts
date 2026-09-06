import fs from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '@/env';
import * as schema from './schema';

/**
 * SQLite connection for the whole app.
 *
 * Cached on globalThis so Next's dev-mode module reloading does not open a new
 * file handle on every hot reload.
 */
function createConnection() {
  fs.mkdirSync(env.DB_DIR, { recursive: true });

  const sqlite = new Database(env.DB_PATH);
  // WAL keeps readers from blocking the single writer - required for a server
  // that renders pages while a background action writes.
  sqlite.pragma('journal_mode = WAL');
  // NORMAL is the recommended durability level in WAL mode.
  sqlite.pragma('synchronous = NORMAL');
  // SQLite has foreign keys off by default; our schema relies on them.
  sqlite.pragma('foreign_keys = ON');
  // Wait instead of throwing SQLITE_BUSY when another write is in flight.
  sqlite.pragma('busy_timeout = 5000');

  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as {
  bricktrackDb?: ReturnType<typeof createConnection>;
};

export const db = globalForDb.bricktrackDb ?? createConnection();

if (!env.isProduction) {
  globalForDb.bricktrackDb = db;
}

export { schema };
export type Db = typeof db;
