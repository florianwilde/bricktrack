import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { collectionItem, collector } from '@/db/schema';
import { SOLD_STATUS } from '@/lib/ownership';

export type CollectorRow = {
  id: string;
  name: string;
  color: string;
  birthday: Date | null;
  notes: string | null;
  sortOrder: number;
  itemCount: number;
};

export function listCollectors(): CollectorRow[] {
  const itemCount = sql<number>`(
    select count(*) from collection_item ci
    where ci.collector_id = ${collector.id} and ci.status <> ${SOLD_STATUS}
  )`.mapWith(Number);

  return db
    .select({
      id: collector.id,
      name: collector.name,
      color: collector.color,
      birthday: collector.birthday,
      notes: collector.notes,
      sortOrder: collector.sortOrder,
      itemCount,
    })
    .from(collector)
    .orderBy(asc(collector.sortOrder), asc(collector.name))
    .all();
}

export function getCollector(id: string) {
  return db.select().from(collector).where(eq(collector.id, id)).get() ?? null;
}

/**
 * The collector a new collection item belongs to when the user did not pick
 * one - which is every time there is only a single collector.
 */
export function defaultCollectorId(): string | null {
  const row = db
    .select({ id: collector.id })
    .from(collector)
    .orderBy(asc(collector.sortOrder), asc(collector.name))
    .get();
  return row?.id ?? null;
}

/**
 * The whole multi-collector idea only becomes visible once a second collector
 * exists. Until then the UI stays exactly as simple as it was.
 */
export function hasMultipleCollectors(): boolean {
  const [row] = db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(collector)
    .all();
  return (row?.total ?? 0) > 1;
}

/** Reads the collector from a URL parameter, ignoring anything unknown. */
export function resolveCollectorId(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const row = db.select({ id: collector.id }).from(collector).where(eq(collector.id, value)).get();
  return row?.id;
}

/** Owned copies per collector - used by the collector management page. */
export function countItemsPerCollector(): Map<string, number> {
  const rows = db
    .select({
      collectorId: collectionItem.collectorId,
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(collectionItem)
    .where(sql`${collectionItem.status} <> ${SOLD_STATUS}`)
    .groupBy(collectionItem.collectorId)
    .all();

  return new Map(
    rows.flatMap((row) => (row.collectorId ? [[row.collectorId, row.total] as const] : [])),
  );
}
