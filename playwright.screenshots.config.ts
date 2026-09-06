import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Produces the screenshots for docs/ANLEITUNG.md.
 *
 * Runs against the production container, not the dev server: the dev server
 * compiles routes on demand, which made the capture run flaky, and the manual
 * should show exactly what a user gets after `docker compose up`.
 *
 *   pnpm screenshots
 */
const PORT = 3220;
const BASE_URL = `http://localhost:${PORT}`;

// Docker wants forward slashes, also on Windows.
const dataDir = path.resolve(process.cwd(), 'data-shots').replace(/\\/g, '/');

export default defineConfig({
  testDir: './e2e',
  testMatch: 'screenshots.spec.ts',
  fullyParallel: false,
  workers: 1,
  // The run registers a user, so a second attempt would start from a state
  // that no longer matches the script.
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    // A phone, because that is how the app is actually used.
    ...devices['Pixel 7'],
  },
  webServer: {
    command: [
      'docker run --rm --name bricktrack-shots',
      `-p ${PORT}:3000`,
      `-e BASE_URL=${BASE_URL}`,
      '-e BETTER_AUTH_SECRET=screenshot-run-secret-0123456789abcdefgh',
      '-e TZ=Europe/Berlin',
      `-v "${dataDir}:/data"`,
      'bricktrack:shots',
    ].join(' '),
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
