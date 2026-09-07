import { execFileSync } from 'node:child_process';

/**
 * Migrates the smoke-test database. The directory itself is wiped earlier by
 * scripts/reset-e2e.mjs, because Playwright starts its web server before this
 * hook runs and the open database file would block the delete on Windows.
 */
export default function globalSetup() {
  execFileSync('node', ['node_modules/tsx/dist/cli.mjs', 'scripts/migrate.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DATA_DIR: './data-e2e' },
  });
}
