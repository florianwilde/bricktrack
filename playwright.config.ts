import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test setup.
 *
 * Runs against the production container with its own data directory
 * (./data-e2e), so a test never touches the real database and never depends on
 * the dev server compiling fast enough.
 */
const PORT = 3210;
const BASE_URL = `http://localhost:${PORT}`;

// Docker wants forward slashes, also on Windows.
const dataDir = path.resolve(process.cwd(), 'data-e2e').replace(/\\/g, '/');

export default defineConfig({
  testDir: './e2e',
  // The screenshot run has its own config, its own server and its own data
  // directory - it must never join the smoke run.
  testMatch: 'smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
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
    command: [
      'docker run --rm --name bricktrack-e2e',
      `-p ${PORT}:3000`,
      `-e BASE_URL=${BASE_URL}`,
      '-e BETTER_AUTH_SECRET=playwright-smoke-test-secret-0123456789abcdef',
      '-e TZ=Europe/Berlin',
      '-e MAX_UPLOAD_MB=25',
      `-v "${dataDir}:/data"`,
      'bricktrack:e2e',
    ].join(' '),
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
