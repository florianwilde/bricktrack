import path from 'node:path';
import { z } from 'zod';

/**
 * Central, validated access to the runtime configuration.
 *
 * Everything the app needs to know about its environment is derived here so
 * that a misconfigured container fails fast and loudly instead of misbehaving
 * at request time. Only imported from server-side code and scripts.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * Public origin the app is reached under, e.g. https://bricktrack.example.de.
   * TLS is terminated by the reverse proxy; this value is what the browser sees
   * and therefore defines the WebAuthn relying party ID.
   */
  BASE_URL: z.url().default('http://localhost:3000'),

  /** Signing secret for sessions and tokens. */
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET braucht mindestens 32 Zeichen'),

  /** Single directory that holds everything worth backing up. */
  DATA_DIR: z.string().min(1).default('./data'),

  /** Upload size limit per file, in megabytes. */
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(200).default(25),

  /** Optional: Rebrickable set import. Import stays disabled without it. */
  REBRICKABLE_API_KEY: z.string().min(1).optional(),

  /**
   * Optional: outgoing mail for wishlist reminders. Without SMTP_HOST the
   * whole reminder feature stays switched off - nothing is scheduled, nothing
   * is sent.
   */
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),

  /** How many days before the event a reminder goes out. */
  REMINDER_DAYS_BEFORE: z.coerce.number().int().min(1).max(90).default(14),
});

/**
 * An empty value counts as "not set".
 *
 * A line like `BASE_URL=` in a .env file is a common slip, and so is an empty
 * variable injected by a container runtime. Falling back to the default beats
 * failing to start with "Invalid URL".
 */
function withoutEmptyValues(source: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string' && value.trim() !== '') result[key] = value;
  }
  return result;
}

function parseEnv() {
  const parsed = schema.safeParse(withoutEmptyValues(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Ungueltige Umgebungsvariablen:\n${issues}`);
  }
  return parsed.data;
}

const raw = parseEnv();

const dataDir = path.resolve(raw.DATA_DIR);
const baseUrl = new URL(raw.BASE_URL);

export const env = {
  ...raw,
  BASE_URL: baseUrl.origin,

  /** Absolute paths derived from the single data directory. */
  DATA_DIR: dataDir,
  DB_DIR: path.join(dataDir, 'db'),
  DB_PATH: path.join(dataDir, 'db', 'bricktrack.db'),
  FILES_DIR: path.join(dataDir, 'files'),

  /**
   * WebAuthn relying party ID: the registrable domain of BASE_URL. Passkeys are
   * bound to it, so changing the domain invalidates existing credentials.
   */
  RP_ID: baseUrl.hostname,
  RP_NAME: 'Bricktrack',

  MAX_UPLOAD_BYTES: raw.MAX_UPLOAD_MB * 1024 * 1024,

  isProduction: raw.NODE_ENV === 'production',

  /** Reminders need a host and a sender; everything else has a default. */
  isMailConfigured: Boolean(raw.SMTP_HOST && raw.SMTP_FROM),
} as const;

export type Env = typeof env;
