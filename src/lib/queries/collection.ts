import 'server-only';
import { and, asc, countDistinct, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionItem,
  collector,
  location,
  manufacturer,
  missingPart,
  set,
  theme,
} from '@/db/schema';
import { ownedCopiesSql, SOLD_STATUS } from '@/lib/ownership';
import type { CollectionStatus, Completeness, Condition } from '@/db/types';
import type { TimelineItem } from '@/lib/timeline';

export type CollectionFilters = {
  q?: string;
  status?: CollectionStatus;
  completeness?: Completeness;
  locationId?: string;
  manufacturerId?: string;
  collectorId?: string;
};

export type CollectionRow = {
  id: string;
  setId: string;
  status: CollectionStatus;
  completeness: Completeness;
  condition: Condition | null;
  locationId: string | null;
  locationName: string | null;
  collectorId: string | null;
  collectorName: string | null;
  collectorColor: string | null;
  acquiredAt: Date | null;
  acquiredPriceCents: number | null;
  acquiredFrom: string | null;
  giftedBy: string | null;
  lentOutTo: string | null;
  notes: string | null;
  setNumber: string;
  setName: string;
  year: number | null;
  pieceCount: number | null;
  imageUrl: string | null;
  imagePath: string | null;
  retailPriceCents: number | null;
  manufacturerName: string;
  themeName: string | null;
};

function buildWhere(filters: CollectionFilters): SQL | undefined {
  const conditions: SQL[] = [];

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    conditions.push(
      sql`(lower(${set.setNumber}) like ${`%${q}%`} or lower(${set.name}) like ${`%${q}%`})`,
    );
  }
  if (filters.status) conditions.push(eq(collectionItem.status, filters.status));
  if (filters.completeness) conditions.push(eq(collectionItem.completeness, filters.completeness));
  if (filters.locationId) conditions.push(eq(collectionItem.locationId, filters.locationId));
  if (filters.manufacturerId) conditions.push(eq(set.manufacturerId, filters.manufacturerId));
  if (filters.collectorId) conditions.push(eq(collectionItem.collectorId, filters.collectorId));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function listCollectionItems(filters: CollectionFilters): CollectionRow[] {
  return db
    .select({
      id: collectionItem.id,
      setId: collectionItem.setId,
      status: collectionItem.status,
      completeness: collectionItem.completeness,
      condition: collectionItem.condition,
      locationId: collectionItem.locationId,
      locationName: location.name,
      collectorId: collectionItem.collectorId,
      collectorName: collector.name,
      collectorColor: collector.color,
      acquiredAt: collectionItem.acquiredAt,
      acquiredPriceCents: collectionItem.acquiredPriceCents,
      acquiredFrom: collectionItem.acquiredFrom,
      giftedBy: collectionItem.giftedBy,
      lentOutTo: collectionItem.lentOutTo,
      notes: collectionItem.notes,
      setNumber: set.setNumber,
      setName: set.name,
      year: set.year,
      pieceCount: set.pieceCount,
      imageUrl: set.imageUrl,
      imagePath: set.imagePath,
      retailPriceCents: set.retailPriceCents,
      manufacturerName: manufacturer.name,
      themeName: theme.name,
    })
    .from(collectionItem)
    .innerJoin(set, eq(set.id, collectionItem.setId))
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .leftJoin(theme, eq(theme.id, set.themeId))
    .leftJoin(location, eq(location.id, collectionItem.locationId))
    .leftJoin(collector, eq(collector.id, collectionItem.collectorId))
    .where(buildWhere(filters))
    .orderBy(asc(manufacturer.name), asc(set.setNumber))
    .all();
}

export type CollectionStats = {
  setCount: number;
  itemCount: number;
  pieceCount: number;
  retailValueCents: number;
  /** Latest observed price where there is one, UVP otherwise. */
  currentValueCents: number;
  paidCents: number;
  byManufacturer: Array<{ name: string; count: number }>;
};

/**
 * The numbers on top of the collection page. Sold copies are history and do
 * not count anywhere - same rule as everywhere else in the app.
 */
export function getCollectionStats(collectorId?: string): CollectionStats {
  const active = collectorId
    ? and(
        sql`${collectionItem.status} <> ${SOLD_STATUS}`,
        eq(collectionItem.collectorId, collectorId),
      )
    : sql`${collectionItem.status} <> ${SOLD_STATUS}`;

  const [totals] = db
    .select({
      setCount: countDistinct(collectionItem.setId),
      itemCount: sql<number>`count(*)`.mapWith(Number),
      pieceCount: sql<number>`coalesce(sum(${set.pieceCount}), 0)`.mapWith(Number),
      retailValueCents: sql<number>`coalesce(sum(${set.retailPriceCents}), 0)`.mapWith(Number),
      paidCents: sql<number>`coalesce(sum(${collectionItem.acquiredPriceCents}), 0)`.mapWith(Number),
    })
    .from(collectionItem)
    .innerJoin(set, eq(set.id, collectionItem.setId))
    .where(active)
    .all();

  const byManufacturer = db
    .select({
      name: manufacturer.name,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(collectionItem)
    .innerJoin(set, eq(set.id, collectionItem.setId))
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .where(active)
    .groupBy(manufacturer.id)
    .orderBy(asc(manufacturer.name))
    .all();

  // Current value per copy: the newest observed price, falling back to the
  // recommended retail price of the set.
  const [current] = db
    .select({
      total: sql<number>`coalesce(sum(coalesce((
        select p.price_cents from price_point p
        where p.set_id = ${set.id}
        order by p.observed_at desc, p.created_at desc
        limit 1
      ), ${set.retailPriceCents}, 0)), 0)`.mapWith(Number),
    })
    .from(collectionItem)
    .innerJoin(set, eq(set.id, collectionItem.setId))
    .where(active)
    .all();

  return {
    setCount: totals?.setCount ?? 0,
    itemCount: totals?.itemCount ?? 0,
    pieceCount: totals?.pieceCount ?? 0,
    retailValueCents: totals?.retailValueCents ?? 0,
    currentValueCents: current?.total ?? 0,
    paidCents: totals?.paidCents ?? 0,
    byManufacturer,
  };
}

/** Number of catalog sets that are not in the collection - the "fehlt" count. */
export function countMissingSets(collectorId?: string): number {
  const [row] = db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(set)
    .where(sql`${ownedCopiesSql(set.id, collectorId)} = 0`)
    .all();

  return row?.total ?? 0;
}

export type MissingPartRow = {
  id: string;
  partNumber: string | null;
  colorName: string | null;
  quantity: number;
  resolved: boolean;
  notes: string | null;
};

export function listMissingParts(collectionItemId: string): MissingPartRow[] {
  return db
    .select({
      id: missingPart.id,
      partNumber: missingPart.partNumber,
      colorName: missingPart.colorName,
      quantity: missingPart.quantity,
      resolved: missingPart.resolved,
      notes: missingPart.notes,
    })
    .from(missingPart)
    .where(eq(missingPart.collectionItemId, collectionItemId))
    // Open entries first: those are the ones you act on.
    .orderBy(asc(missingPart.resolved), asc(missingPart.createdAt))
    .all();
}

/** Open missing parts per collection item, for the badges in the lists. */
export function countOpenMissingParts(collectionItemIds: string[]): Map<string, number> {
  if (collectionItemIds.length === 0) return new Map();

  const rows = db
    .select({
      collectionItemId: missingPart.collectionItemId,
      open: sql<number>`count(*)`.mapWith(Number),
    })
    .from(missingPart)
    .where(
      and(
        inArray(missingPart.collectionItemId, collectionItemIds),
        eq(missingPart.resolved, false),
      ),
    )
    .groupBy(missingPart.collectionItemId)
    .all();

  return new Map(rows.map((row) => [row.collectionItemId, row.open]));
}

/**
 * Every copy still in the house, with what the timeline needs. Sold copies are
 * left out, like in every other number on the collection page.
 */
export function listTimelineItems(collectorId?: string): TimelineItem[] {
  const active = collectorId
    ? and(
        sql`${collectionItem.status} <> ${SOLD_STATUS}`,
        eq(collectionItem.collectorId, collectorId),
      )
    : sql`${collectionItem.status} <> ${SOLD_STATUS}`;

  return db
    .select({
      id: collectionItem.id,
      setId: collectionItem.setId,
      setNumber: set.setNumber,
      setName: set.name,
      acquiredAt: collectionItem.acquiredAt,
      pieceCount: set.pieceCount,
      acquiredPriceCents: collectionItem.acquiredPriceCents,
      giftedBy: collectionItem.giftedBy,
    })
    .from(collectionItem)
    .innerJoin(set, eq(set.id, collectionItem.setId))
    .where(active)
    .all();
}
