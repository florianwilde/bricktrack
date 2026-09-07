/**
 * Prepares the smoke run.
 *
 * The tests run against the production image, not the dev server: the dev
 * server compiles routes on demand and, under the load of a full run, would
 * occasionally drop a chunk mid-navigation. Testing the artefact that people
 * actually deploy is also simply more useful.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data-e2e');

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(path.join(dataDir, 'db'), { recursive: true });
fs.mkdirSync(path.join(dataDir, 'files'), { recursive: true });
console.log(`[e2e] ${dataDir} zurueckgesetzt.`);

console.log('[e2e] Image wird gebaut (bricktrack:e2e) …');
execFileSync('docker', ['build', '-t', 'bricktrack:e2e', '.'], { stdio: 'inherit' });
console.log('[e2e] Image ist bereit.');
