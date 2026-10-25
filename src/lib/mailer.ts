import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { getMailConfig, type MailConfig } from '@/lib/mail-settings';

/**
 * Outgoing mail.
 *
 * Entirely optional: without a server - in the .env or on the reminders page -
 * nothing is sent. The app never depends on mail working.
 */

let cached: { key: string; transporter: Transporter; from: string } | null = null;

function connectionKey(config: MailConfig): string {
  return JSON.stringify([config.host, config.port, config.security, config.user, config.password]);
}

function getTransport(): { transporter: Transporter; from: string } | null {
  const config = getMailConfig();
  if (!config) return null;

  // Settings can change at runtime now; a new connection follows them.
  const key = connectionKey(config);
  if (cached?.key === key) return { transporter: cached.transporter, from: config.from };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // Implicit TLS on 465, STARTTLS on 587 - the usual pair.
    secure: config.security === 'tls',
    ignoreTLS: config.security === 'none',
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  });

  cached = { key, transporter, from: config.from };
  return { transporter, from: config.from };
}

export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const transport = getTransport();
  if (!transport) {
    return { ok: false, error: 'Es ist kein SMTP-Server konfiguriert.' };
  }

  try {
    await transport.transporter.sendMail({
      from: transport.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true };
  } catch (error) {
    console.error('[mail] Versand fehlgeschlagen', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Der Versand ist fehlgeschlagen.',
    };
  }
}

/** Checks the connection without sending anything. */
export async function verifyMailConnection(): Promise<MailResult> {
  const transport = getTransport();
  if (!transport) {
    return { ok: false, error: 'Es ist kein SMTP-Server konfiguriert.' };
  }

  try {
    await transport.transporter.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Der Server antwortet nicht.',
    };
  }
}
