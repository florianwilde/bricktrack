'use server';

import { revalidatePath } from 'next/cache';
import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import { env } from '@/env';
import { sendMail, verifyMailConnection } from '@/lib/mailer';
import { runReminderJob, type ReminderRun } from '@/lib/reminder-job';
import { requireAdmin } from '@/lib/session';

export async function testMailConnection(): Promise<ActionResult> {
  await requireAdmin();

  const result = await verifyMailConnection();
  return result.ok ? { ok: true } : actionError(result.error);
}

export async function sendTestMail(): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (!env.isMailConfigured) {
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

  if (!env.isMailConfigured) {
    return actionError('Es ist kein SMTP-Server konfiguriert.');
  }

  const run = await runReminderJob();
  revalidatePath('/verwaltung/erinnerungen');
  return actionData(run);
}
