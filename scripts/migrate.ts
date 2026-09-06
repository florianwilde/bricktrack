/**
 * Applies pending migrations from ./drizzle to the SQLite file.
 *
 * Runs on every container start (see docker/entrypoint.sh) and locally via
 * `pnpm db:migrate`. Uses the migrator from drizzle-orm, which is part of the
 * runtime bundle, so the image does not need drizzle-kit.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config as loadEnv } from 'dotenv';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

loadEnv({ path: '.env', quiet: true });

const dataDir = path.resolve(process.env.DATA_DIR ?? './data');
const dbDir = path.join(dataDir, 'db');
const dbPath = path.join(dbDir, 'bricktrack.db');
const migrationsFolder = path.resolve(process.env.MIGRATIONS_DIR ?? './drizzle');

fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, 'files'), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);

console.log(`[migrate] Datenbank: ${dbPath}`);
console.log(`[migrate] Migrationen: ${migrationsFolder}`);

migrate(db, { migrationsFolder });

console.log('[migrate] Fertig.');
sqlite.close();
