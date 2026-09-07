/**
 * Prepares the screenshot run.
 *
 * The pictures are taken against the production image rather than the dev
 * server: the dev server recompiles routes on demand, which made the capture
 * run flaky, and the manual should show what people actually run.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data-shots');

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(path.join(dataDir, 'db'), { recursive: true });
fs.mkdirSync(path.join(dataDir, 'files'), { recursive: true });
console.log(`[screenshots] ${dataDir} zurueckgesetzt.`);

console.log('[screenshots] Image wird gebaut (bricktrack:shots) …');
execFileSync('docker', ['build', '-t', 'bricktrack:shots', '.'], { stdio: 'inherit' });
console.log('[screenshots] Image ist bereit.');
