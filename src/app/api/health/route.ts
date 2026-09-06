import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * Container healthcheck. Verifies that the process is up *and* that the SQLite
 * file is readable - a healthy Node process on a broken volume is not healthy.
 */
export function GET() {
  try {
    db.get(sql`select 1`);
    return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
  } catch (error) {
    console.error('[health] Datenbank nicht erreichbar', error);
    return NextResponse.json({ status: 'error', error: 'database unavailable' }, { status: 503 });
  }
}
