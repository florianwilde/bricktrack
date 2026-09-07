import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
      // `server-only` is a build-time marker that throws when imported outside
      // a server component. Stubbing it keeps server modules testable.
      'server-only': path.resolve(root, './tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.ts'],
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
  },
});
