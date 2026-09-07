import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/env';

/**
 * Outgoing mail.
 *
 * Entirely optional: without SMTP_HOST and SMTP_FROM nothing is scheduled and
 * nothing is sent. The app never depends on mail working.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.isMailConfigured) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Implicit TLS on 465, STARTTLS on 587 - the usual pair.
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });

  return transporter;
}

export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<MailResult> {
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, error: 'Es ist kein SMTP-Server konfiguriert.' };
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
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
  const transport = getTransporter();
  if (!transport) {
    return { ok: false, error: 'Es ist kein SMTP-Server konfiguriert.' };
  }

  try {
    await transport.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Der Server antwortet nicht.',
    };
  }
}
