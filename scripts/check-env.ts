/**
 * Checks whether this machine can run Bricktrack, before anything else does.
 *
 * Run with `pnpm pruefe:umgebung`. Reads .env like the other scripts, reuses
 * the validation from src/env.ts and adds what the schema cannot see: tool
 * versions, the example secret left in place, a data directory that is not
 * writable, a half-configured mail server. Exits with 1 if anything would
 * stop the app; warnings alone keep the exit code at 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

type Level = 'ok' | 'warn' | 'error';

const results: { level: Level; message: string }[] = [];
const report = (level: Level, message: string) => results.push({ level, message });

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  packageManager?: string;
  engines?: { node?: string };
};

// tsx runs this as CommonJS, where top-level await is not available.
async function main() {
  // --- Tools -----------------------------------------------------------------

  const major = (version: string) => Number(version.replace(/^\D*/, '').split('.')[0]);

  const requiredNode = major(pkg.engines?.node ?? '22');
  const nodeVersion = process.versions.node;
  if (major(nodeVersion) >= requiredNode) {
    report('ok', `Node ${nodeVersion}`);
  } else {
    report('error', `Node ${nodeVersion} ist zu alt, gebraucht wird ${pkg.engines?.node}`);
  }

  // pnpm announces itself in the user agent of the scripts it runs.
  const pnpmVersion = process.env.npm_config_user_agent?.match(/pnpm\/(\S+)/)?.[1];
  const wantedPnpm = pkg.packageManager?.match(/^pnpm@(\S+)/)?.[1];
  if (!pnpmVersion) {
    report('warn', 'Nicht über pnpm gestartet – Version nicht geprüft (pnpm pruefe:umgebung)');
  } else if (wantedPnpm && major(pnpmVersion) !== major(wantedPnpm)) {
    report('error', `pnpm ${pnpmVersion}, erwartet wird ${wantedPnpm} (corepack enable pnpm)`);
  } else {
    report('ok', `pnpm ${pnpmVersion}`);
  }

  if (fs.existsSync(path.join(root, 'node_modules'))) {
    try {
      // The native module is the part that breaks after a Node upgrade.
      const { default: Database } = await import('better-sqlite3');
      new Database(':memory:').close();
      report('ok', 'Abhängigkeiten installiert, SQLite lädt');
    } catch (error) {
      report('error', `better-sqlite3 lädt nicht (pnpm rebuild better-sqlite3): ${String(error)}`);
    }
  } else {
    report('error', 'node_modules fehlt (pnpm install)');
  }

  // --- .env ------------------------------------------------------------------

  const envFile = path.join(root, '.env');
  if (fs.existsSync(envFile)) {
    loadEnv({ path: envFile, quiet: true });
    report('ok', '.env gefunden');
  } else {
    report('warn', '.env fehlt – es gelten nur Umgebung und Standardwerte (cp .env.example .env)');
  }

  let env: typeof import('../src/env').env | undefined;
  try {
    ({ env } = await import('../src/env'));
    report('ok', 'Umgebungsvariablen gültig');
  } catch (error) {
    report('error', error instanceof Error ? error.message : String(error));
  }

  if (env) {
    const example = fs.existsSync(path.join(root, '.env.example'))
      ? fs.readFileSync(path.join(root, '.env.example'), 'utf8').match(/^BETTER_AUTH_SECRET=(.*)$/m)?.[1]
      : undefined;
    if (example && env.BETTER_AUTH_SECRET === example.trim()) {
      report(
        env.isProduction ? 'error' : 'warn',
        'BETTER_AUTH_SECRET ist noch der Beispielwert (openssl rand -base64 48)',
      );
    }

    const url = new URL(env.BASE_URL);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      report('warn', `BASE_URL ${env.BASE_URL} ohne HTTPS – Passkeys gehen nur über https oder localhost`);
    } else {
      report('ok', `BASE_URL ${env.BASE_URL}`);
    }

    // The directory may not exist yet (db:migrate creates it), so test the
    // closest ancestor that does.
    let existing = env.DATA_DIR;
    while (!fs.existsSync(existing) && path.dirname(existing) !== existing) {
      existing = path.dirname(existing);
    }
    try {
      fs.accessSync(existing, fs.constants.W_OK);
      report(
        'ok',
        existing === env.DATA_DIR
          ? `DATA_DIR ${env.DATA_DIR} beschreibbar`
          : `DATA_DIR ${env.DATA_DIR} fehlt noch, wird von pnpm db:migrate angelegt`,
      );
    } catch {
      report('error', `DATA_DIR ${env.DATA_DIR} ist nicht beschreibbar (${existing})`);
    }

    if (existing === env.DATA_DIR && !fs.existsSync(env.DB_PATH)) {
      report('warn', 'Noch keine Datenbank (pnpm db:migrate)');
    }

    report(
      env.REBRICKABLE_API_KEY ? 'ok' : 'warn',
      env.REBRICKABLE_API_KEY
        ? 'Rebrickable-Key gesetzt'
        : 'Kein REBRICKABLE_API_KEY – Lego-Import aus, alles andere geht',
    );

    if (env.SMTP_HOST && !env.SMTP_FROM) {
      report('warn', 'SMTP_HOST ohne SMTP_FROM – Mailversand bleibt aus');
    } else if (!env.SMTP_HOST && (env.SMTP_FROM || env.SMTP_USER || env.SMTP_PASSWORD)) {
      report('warn', 'SMTP-Angaben ohne SMTP_HOST werden ignoriert');
    } else if (env.SMTP_USER && !env.SMTP_PASSWORD) {
      report('warn', 'SMTP_USER ohne SMTP_PASSWORD');
    } else if (env.isMailConfigured) {
      report('ok', `Mailserver aus .env: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    }
  }

  // --- Output ----------------------------------------------------------------

  const symbol: Record<Level, string> = { ok: '✓', warn: '!', error: '✗' };
  for (const { level, message } of results) {
    console.log(`${symbol[level]} ${message}`);
  }

  const errors = results.filter((r) => r.level === 'error').length;
  const warnings = results.filter((r) => r.level === 'warn').length;
  console.log(
    errors > 0
      ? `\n${errors} Fehler, ${warnings} Hinweise – so startet Bricktrack nicht.`
      : `\nAlles bereit${warnings > 0 ? ` (${warnings} Hinweise)` : ''}.`,
  );
  process.exitCode = errors > 0 ? 1 : 0;
}

void main();
