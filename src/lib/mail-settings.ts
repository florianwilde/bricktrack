import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appSetting } from '@/db/schema';
import { env } from '@/env';
import { openSecret, sealSecret } from '@/lib/secret-box';
import type { MailSettingsInput } from '@/lib/validation';

/**
 * Where the SMTP server comes from.
 *
 * The .env wins when it names a server: an admin who configured it there
 * expects exactly that. Otherwise the settings made on the reminders page
 * apply. Without either, reminders stay off.
 */

export type MailSecurity = 'starttls' | 'tls' | 'none';

export type MailConfig = {
  source: 'env' | 'app';
  host: string;
  port: number;
  security: MailSecurity;
  user: string | null;
  password: string | null;
  from: string;
};

type StoredMail = {
  host: string;
  port: number;
  security: MailSecurity;
  user: string | null;
  /** Encrypted, see secret-box.ts. */
  password: string | null;
  from: string;
};

const KEY = 'smtp';

function readStored(): StoredMail | null {
  const row = db.select().from(appSetting).where(eq(appSetting.key, KEY)).get();
  return (row?.value as StoredMail | undefined) ?? null;
}

export function getMailConfig(): MailConfig | null {
  if (env.isMailConfigured) {
    return {
      source: 'env',
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      security: env.SMTP_SECURE || env.SMTP_PORT === 465 ? 'tls' : 'starttls',
      user: env.SMTP_USER ?? null,
      password: env.SMTP_PASSWORD ?? null,
      from: env.SMTP_FROM!,
    };
  }

  const stored = readStored();
  if (!stored) return null;
  return {
    source: 'app',
    host: stored.host,
    port: stored.port,
    security: stored.security,
    user: stored.user,
    password: stored.password ? openSecret(stored.password, env.BETTER_AUTH_SECRET) : null,
    from: stored.from,
  };
}

export function isMailConfigured(): boolean {
  return getMailConfig() !== null;
}

/** What the settings form may show - never the password itself. */
export type MailSettingsView = {
  source: 'env' | 'app' | null;
  host: string;
  port: number;
  security: MailSecurity;
  user: string;
  from: string;
  hasPassword: boolean;
  /** A password is stored but cannot be decrypted (BETTER_AUTH_SECRET changed). */
  passwordUnreadable: boolean;
};

export function getMailSettingsView(): MailSettingsView {
  const config = getMailConfig();
  const stored = config?.source === 'env' ? null : readStored();

  return {
    source: config?.source ?? null,
    host: config?.host ?? '',
    port: config?.port ?? 587,
    security: config?.security ?? 'starttls',
    user: config?.user ?? '',
    from: config?.from ?? '',
    hasPassword: Boolean(config?.password),
    passwordUnreadable: Boolean(stored?.password && !config?.password),
  };
}

export function saveMailSettings(input: MailSettingsInput): void {
  const previous = readStored();

  let password = previous?.password ?? null;
  if (input.clearPassword) password = null;
  if (input.password) password = sealSecret(input.password, env.BETTER_AUTH_SECRET);

  const value: StoredMail = {
    host: input.host,
    port: input.port,
    security: input.security,
    user: input.user,
    password,
    from: input.from,
  };

  db.insert(appSetting)
    .values({ key: KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedAt: new Date() } })
    .run();
}

export function deleteMailSettings(): void {
  db.delete(appSetting).where(eq(appSetting.key, KEY)).run();
}
