import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ensureReminderScheduler } from '@/lib/reminder-job';

export const dynamic = 'force-dynamic';

/**
 * Container healthcheck. Verifies that the process is up *and* that the SQLite
 * file is readable - a healthy Node process on a broken volume is not healthy.
 */
export function GET() {
  // The container polls this every 30s, which makes it the earliest reliable
  // moment to have the reminder scheduler running. Repeat calls are free.
  ensureReminderScheduler();

  try {
    db.get(sql`select 1`);
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (error) {
    console.error('[health] Datenbank nicht erreichbar', error);
    return NextResponse.json({ status: 'error', error: 'database unavailable' }, { status: 503 });
  }
}
