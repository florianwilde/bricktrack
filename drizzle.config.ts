import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: '.env', quiet: true });

// drizzle-kit runs outside the app, so it reads the raw env instead of src/env
// (which would demand runtime-only variables such as BETTER_AUTH_SECRET).
const dataDir = path.resolve(process.env.DATA_DIR ?? './data');

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: path.join(dataDir, 'db', 'bricktrack.db'),
  },
  strict: true,
  verbose: true,
});
