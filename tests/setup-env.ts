/**
 * Baseline environment for unit tests.
 *
 * src/env.ts validates on import and refuses to start on a bad configuration -
 * which is the point in production, but in tests every module that reads the
 * environment would fail before its first assertion. These are placeholders,
 * never anything a test asserts on.
 *
 * BASE_URL is overwritten unconditionally: Vite uses that very name for its
 * public base path and sets it to "/", which is not a URL. The clash only
 * exists under Vite-based tooling, never in the app itself.
 */
// NODE_ENV is typed read-only; vitest already sets it to 'test'.
process.env.BASE_URL = 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'test-secret-mindestens-32-zeichen-lang-0123';
process.env.DATA_DIR = process.env.DATA_DIR || './data-test';
