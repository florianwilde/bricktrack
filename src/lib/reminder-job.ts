import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { user, wishlist } from '@/db/schema';
import { env } from '@/env';
import { sendMail } from './mailer';
import {
  reminderSubject,
  reminderText,
  shouldRemind,
  type RemindableWishlist,
} from './reminders';

/**
 * Sends the due wishlist reminders.
 *
 * Run from the hourly scheduler and from the "jetzt prüfen" button. Sending is
 * recorded on the list, so a second run within the week stays quiet.
 */

export type ReminderRun = {
  checked: number;
  sent: number;
  skipped: number;
  failures: Array<{ title: string; error: string }>;
};

type Candidate = RemindableWishlist & {
  ownerEmail: string;
  ownerName: string;
  shareToken: string;
  isPublic: boolean;
};

function loadCandidates(): Candidate[] {
  const openItems = sql<number>`(
    select count(*) from wishlist_item wi
    where wi.wishlist_id = ${wishlist.id}
      and wi.reserved_at is null
      and wi.fulfilled_at is null
  )`.mapWith(Number);

  return db
    .select({
      id: wishlist.id,
      title: wishlist.title,
      eventDate: wishlist.eventDate,
      lastReminderAt: wishlist.lastReminderAt,
      shareToken: wishlist.shareToken,
      isPublic: wishlist.isPublic,
      ownerEmail: user.email,
      ownerName: user.name,
      openItemCount: openItems,
    })
    .from(wishlist)
    .innerJoin(user, eq(user.id, wishlist.ownerUserId))
    .all();
}

export async function runReminderJob(now = new Date()): Promise<ReminderRun> {
  const result: ReminderRun = { checked: 0, sent: 0, skipped: 0, failures: [] };
  if (!env.isMailConfigured) return result;

  const candidates = loadCandidates();
  result.checked = candidates.length;

  for (const candidate of candidates) {
    const decision = shouldRemind(candidate, {
      now,
      daysBefore: env.REMINDER_DAYS_BEFORE,
    });

    if (!decision.remind) {
      result.skipped += 1;
      continue;
    }

    const mail = await sendMail({
      to: candidate.ownerEmail,
      subject: reminderSubject(candidate, decision.daysLeft),
      text: reminderText({
        title: candidate.title,
        daysLeft: decision.daysLeft,
        openItemCount: candidate.openItemCount,
        shareUrl: candidate.isPublic
          ? `${env.BASE_URL}/w/${candidate.shareToken}`
          : '(Teilen ist für diese Liste ausgeschaltet)',
        appUrl: `${env.BASE_URL}/wunschlisten/${candidate.id}`,
      }),
    });

    if (!mail.ok) {
      result.failures.push({ title: candidate.title, error: mail.error });
      continue;
    }

    // Only after a successful send - a failed attempt must be retried.
    db.update(wishlist)
      .set({ lastReminderAt: now })
      .where(eq(wishlist.id, candidate.id))
      .run();
    result.sent += 1;
  }

  return result;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Started lazily from the first server render or healthcheck rather than from
 * Next's instrumentation hook: that hook is compiled for the edge runtime too,
 * and pulling the native SQLite driver into that bundle breaks the build.
 * Cached on globalThis so the dev server's module reloading cannot stack up
 * several schedulers.
 */
const globalForScheduler = globalThis as unknown as { bricktrackReminders?: boolean };

export function ensureReminderScheduler(): void {
  if (globalForScheduler.bricktrackReminders) return;
  globalForScheduler.bricktrackReminders = true;
  startReminderScheduler();
}

/**
 * Starts the hourly check.
 *
 * Hourly rather than daily so a restart cannot skip a day, and the per-list
 * cooldown keeps that from turning into repeated mail.
 */
export function startReminderScheduler(): void {
  if (!env.isMailConfigured) {
    console.log('[reminders] Kein SMTP konfiguriert - Erinnerungen sind aus.');
    return;
  }

  console.log(
    `[reminders] Aktiv: Erinnerung ${env.REMINDER_DAYS_BEFORE} Tage vor dem Termin, stuendliche Pruefung.`,
  );

  const tick = () => {
    void runReminderJob()
      .then((run) => {
        if (run.sent > 0 || run.failures.length > 0) {
          console.log(
            `[reminders] ${run.sent} verschickt, ${run.failures.length} fehlgeschlagen.`,
          );
        }
      })
      .catch((error) => console.error('[reminders] Durchlauf fehlgeschlagen', error));
  };

  // A short delay so the first check does not compete with the app's start-up.
  setTimeout(tick, 60_000).unref?.();
  setInterval(tick, HOUR_MS).unref?.();
}
