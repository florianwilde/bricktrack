'use server';

import { revalidatePath } from 'next/cache';
import {
  actionData,
  actionError,
  actionOk,
  formToObject,
  parseForm,
  type ActionResult,
} from '@/lib/action-result';
import { env } from '@/env';
import {
  deleteMailSettings,
  getMailConfig,
  isMailConfigured,
  saveMailSettings,
} from '@/lib/mail-settings';
import { sendMail, verifyMailConnection } from '@/lib/mailer';
import { mailSettingsSchema } from '@/lib/validation';
import { runReminderJob, type ReminderRun } from '@/lib/reminder-job';
import { requireAdmin } from '@/lib/session';

export async function testMailConnection(): Promise<ActionResult> {
  await requireAdmin();

  const result = await verifyMailConnection();
  return result.ok ? { ok: true } : actionError(result.error);
}

export async function sendTestMail(): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!isMailConfigured()) {
    return actionError('Es ist kein SMTP-Server konfiguriert.');
  }

  const result = await sendMail({
    to: admin.email,
    subject: 'Bricktrack: Testnachricht',
    text: [
      'Das hat geklappt.',
      '',
      'Wenn diese Nachricht ankommt, funktionieren auch die Erinnerungen zu',
      'Wunschlisten-Terminen.',
      '',
      env.BASE_URL,
    ].join('\n'),
  });

  return result.ok ? { ok: true } : actionError(result.error);
}

/** Runs the check immediately instead of waiting for the next hour. */
export async function runRemindersNow(): Promise<ActionResult<ReminderRun>> {
  await requireAdmin();

  if (!isMailConfigured()) {
    return actionError('Es ist kein SMTP-Server konfiguriert.');
  }

  const run = await runReminderJob();
  revalidatePath('/verwaltung/erinnerungen');
  return actionData(run);
}

/** Stores the SMTP server set up on the reminders page. */
export async function saveMailSettingsAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  if (getMailConfig()?.source === 'env') {
    return actionError('Der Mailserver kommt aus der .env. Änderungen bitte dort vornehmen.');
  }

  const parsed = parseForm(mailSettingsSchema, formToObject(formData));
  if (!parsed.ok) return parsed;

  saveMailSettings(parsed.data);
  revalidatePath('/verwaltung/erinnerungen');
  return actionOk();
}

export async function deleteMailSettingsAction(): Promise<ActionResult> {
  await requireAdmin();
  deleteMailSettings();
  revalidatePath('/verwaltung/erinnerungen');
  return actionOk();
}
