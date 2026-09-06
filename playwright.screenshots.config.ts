import { defineConfig, devices } from '@playwright/test';

/**
 * Produces the screenshots for docs/ANLEITUNG.md.
 *
 * Kept apart from the smoke test on purpose: this run needs seeded example
 * data and writes files into the repository, which a test never should.
 *
 *   pnpm screenshots
 */
const PORT = 3220;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'screenshots.spec.ts',
  globalSetup: './e2e/screenshots-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 240_000,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    // A phone, because that is how the app is actually used.
    ...devices['Pixel 7'],
  },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'development',
      DATA_DIR: './data-shots',
      BASE_URL,
      BETTER_AUTH_SECRET: 'screenshot-run-secret-0123456789abcdefgh',
      MAX_UPLOAD_MB: '25',
    },
  },
});
