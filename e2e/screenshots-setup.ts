import { execFileSync } from 'node:child_process';

/** Migrates the screenshot database; the directory is wiped by the npm script. */
export default function globalSetup() {
  execFileSync('node', ['node_modules/tsx/dist/cli.mjs', 'scripts/migrate.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DATA_DIR: './data-shots' },
  });
}
