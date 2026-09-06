/**
 * Wipes the Playwright data directory before the smoke run.
 *
 * Runs before Playwright starts, because Playwright boots its web server
 * before global setup - on Windows the open SQLite file would then block the
 * delete.
 */
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data-e2e');
fs.rmSync(dataDir, { recursive: true, force: true });
console.log(`[e2e] ${dataDir} zurueckgesetzt.`);
