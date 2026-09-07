import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { wishlist } from '@/db/schema';
import { env } from '@/env';
import {
  ReminderSettings,
  type ReminderListRow,
} from '@/components/verwaltung/reminder-settings';
import { daysUntil } from '@/lib/reminders';
import { requireAdmin } from '@/lib/session';

export const metadata: Metadata = { title: 'Erinnerungen' };

export default async function ErinnerungenPage() {
  const admin = await requireAdmin();

  const openItems = sql<number>`(
    select count(*) from wishlist_item wi
    where wi.wishlist_id = ${wishlist.id}
      and wi.reserved_at is null
      and wi.fulfilled_at is null
  )`.mapWith(Number);

  const now = new Date();
  const lists: ReminderListRow[] = db
    .select({
      id: wishlist.id,
      title: wishlist.title,
      eventDate: wishlist.eventDate,
      lastReminderAt: wishlist.lastReminderAt,
      openItemCount: openItems,
    })
    .from(wishlist)
    .where(eq(wishlist.ownerUserId, admin.id))
    .all()
    .filter((row) => row.eventDate !== null)
    .map((row) => ({
      ...row,
      daysLeft: row.eventDate ? daysUntil(row.eventDate, now) : null,
    }))
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  return (
    <ReminderSettings
      configured={env.isMailConfigured}
      daysBefore={env.REMINDER_DAYS_BEFORE}
      lists={lists}
    />
  );
}
