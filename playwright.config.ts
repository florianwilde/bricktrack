import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test setup.
 *
 * Runs against its own data directory (./data-e2e) so a test never touches the
 * real database. The global setup wipes and migrates it before each run.
 */
const PORT = 3210;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // The screenshot run has its own config, its own server and its own data
  // directory - it must never join the smoke run.
  testMatch: 'smoke.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Generous: the dev server compiles each route on first visit.
  timeout: 240_000,
  // A first navigation to a route the dev server has not compiled yet can
  // take well over ten seconds on a cold cache.
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    {
      name: 'mobile',
      // The app is built for phones first, so the smoke test uses one.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'development',
      DATA_DIR: './data-e2e',
      BASE_URL,
      BETTER_AUTH_SECRET: 'playwright-smoke-test-secret-0123456789abcdef',
      MAX_UPLOAD_MB: '25',
    },
  },
});
