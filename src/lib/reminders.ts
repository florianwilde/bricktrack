/**
 * When to remind someone about a wishlist.
 *
 * Pure rules, no database and no mail: a reminder that arrives at the wrong
 * moment is worse than none, so this is the part that gets tested.
 */

export type RemindableWishlist = {
  id: string;
  title: string;
  eventDate: Date | null;
  openItemCount: number;
  lastReminderAt: Date | null;
};

export type ReminderDecision =
  | { remind: true; daysLeft: number }
  | { remind: false; reason: 'no-date' | 'too-early' | 'past' | 'nothing-open' | 'already-sent' };

/** Whole days between two points, ignoring the time of day. */
export function daysUntil(target: Date, now: Date): number {
  const startOfTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const startOfNow = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfTarget - startOfNow) / 86_400_000);
}

/**
 * A reminder goes out when the date is close, something is still unclaimed,
 * and we have not just written about it.
 */
export function shouldRemind(
  list: RemindableWishlist,
  options: { now: Date; daysBefore: number; minDaysBetween?: number },
): ReminderDecision {
  const minDaysBetween = options.minDaysBetween ?? 7;

  if (!list.eventDate) return { remind: false, reason: 'no-date' };

  const daysLeft = daysUntil(list.eventDate, options.now);
  // The day itself still counts - a morning reminder can save the afternoon.
  if (daysLeft < 0) return { remind: false, reason: 'past' };
  if (daysLeft > options.daysBefore) return { remind: false, reason: 'too-early' };

  // Nothing open means everything is taken care of; silence is the right answer.
  if (list.openItemCount <= 0) return { remind: false, reason: 'nothing-open' };

  if (list.lastReminderAt) {
    // daysUntil(now, lastReminderAt) reads as "days from the last reminder
    // until now", which is exactly the age of that reminder.
    const daysSinceLast = daysUntil(options.now, list.lastReminderAt);
    if (daysSinceLast < minDaysBetween) return { remind: false, reason: 'already-sent' };
  }

  return { remind: true, daysLeft };
}

/** German subject line, because that is what lands in the inbox. */
export function reminderSubject(list: RemindableWishlist, daysLeft: number): string {
  if (daysLeft === 0) return `Heute: ${list.title}`;
  if (daysLeft === 1) return `Morgen: ${list.title}`;
  return `In ${daysLeft} Tagen: ${list.title}`;
}

export function reminderText(input: {
  title: string;
  daysLeft: number;
  openItemCount: number;
  shareUrl: string;
  appUrl: string;
}): string {
  const when =
    input.daysLeft === 0
      ? 'ist heute'
      : input.daysLeft === 1
        ? 'ist morgen'
        : `ist in ${input.daysLeft} Tagen`;

  const open =
    input.openItemCount === 1
      ? 'steht noch 1 Wunsch offen'
      : `stehen noch ${input.openItemCount} Wünsche offen`;

  return [
    `Der Termin für „${input.title}" ${when}, und auf der Liste ${open}.`,
    '',
    `Liste ansehen:  ${input.appUrl}`,
    `Zum Teilen:     ${input.shareUrl}`,
    '',
    'Diese Erinnerung kommt von deinem eigenen Bricktrack.',
  ].join('\n');
}
