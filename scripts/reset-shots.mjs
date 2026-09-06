/** Wipes the screenshot data directory before `pnpm screenshots`. */
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data-shots');
fs.rmSync(dataDir, { recursive: true, force: true });
console.log(`[screenshots] ${dataDir} zurueckgesetzt.`);
