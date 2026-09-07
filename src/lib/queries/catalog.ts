import 'server-only';
import { and, asc, desc, eq, like, not, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { collectionItem, instruction, manufacturer, photo, set, theme } from '@/db/schema';
import { ownedCopiesSql, wishlistCountSql, type OwnershipFilter } from '@/lib/ownership';

export const CATALOG_PAGE_SIZE = 48;

export type CatalogFilters = {
  q?: string;
  manufacturerId?: string;
  themeId?: string;
  year?: number;
  ownership?: OwnershipFilter;
  /** Hides sets that are already on this wishlist (for "aus fehlenden Sets hinzufügen"). */
  excludeWishlistId?: string;
  page?: number;
};

export type CatalogRow = {
  id: string;
  setNumber: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  imageUrl: string | null;
  imagePath: string | null;
  retailPriceCents: number | null;
  manufacturerName: string;
  themeName: string | null;
  ownedCopies: number;
  wishlistCount: number;
};

function buildWhere(filters: CatalogFilters): SQL | undefined {
  const conditions: SQL[] = [];

  const q = filters.q?.trim();
  if (q) {
    // Matching set number and name covers how people actually search: either
    // they read the number off the box, or they remember the name.
    const pattern = `%${q.toLowerCase()}%`;
    const match = or(
      like(sql`lower(${set.setNumber})`, pattern),
      like(sql`lower(${set.name})`, pattern),
      like(sql`lower(coalesce(${set.ean}, ''))`, pattern),
    );
    if (match) conditions.push(match);
  }

  if (filters.manufacturerId) conditions.push(eq(set.manufacturerId, filters.manufacturerId));
  if (filters.themeId) conditions.push(eq(set.themeId, filters.themeId));
  if (filters.year !== undefined) conditions.push(eq(set.year, filters.year));

  const owned = ownedCopiesSql(set.id);
  switch (filters.ownership) {
    case 'sammlung':
      conditions.push(sql`${owned} > 0`);
      break;
    case 'fehlt':
      conditions.push(sql`${owned} = 0`);
      break;
    case 'wunschliste':
      conditions.push(sql`${wishlistCountSql(set.id)} > 0`);
      break;
    default:
      break;
  }

  if (filters.excludeWishlistId) {
    conditions.push(
      sql`not exists (
        select 1 from wishlist_item wi
        where wi.set_id = ${set.id} and wi.wishlist_id = ${filters.excludeWishlistId}
      )`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function listSets(filters: CatalogFilters): { rows: CatalogRow[]; total: number } {
  const where = buildWhere(filters);
  const page = Math.max(1, filters.page ?? 1);

  const rows = db
    .select({
      id: set.id,
      setNumber: set.setNumber,
      name: set.name,
      year: set.year,
      pieceCount: set.pieceCount,
      imageUrl: set.imageUrl,
      imagePath: set.imagePath,
      retailPriceCents: set.retailPriceCents,
      manufacturerName: manufacturer.name,
      themeName: theme.name,
      ownedCopies: ownedCopiesSql(set.id).mapWith(Number),
      wishlistCount: wishlistCountSql(set.id).mapWith(Number),
    })
    .from(set)
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .leftJoin(theme, eq(theme.id, set.themeId))
    .where(where)
    .orderBy(asc(manufacturer.name), asc(set.setNumber))
    .limit(CATALOG_PAGE_SIZE)
    .offset((page - 1) * CATALOG_PAGE_SIZE)
    .all();

  const [totals] = db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(set)
    .where(where)
    .all();

  return { rows, total: totals?.total ?? 0 };
}

/** All set ids matching the current filters - used by "alle auswählen". */
export function listSetIds(filters: CatalogFilters): string[] {
  return db
    .select({ id: set.id })
    .from(set)
    .where(buildWhere(filters))
    .all()
    .map((row) => row.id);
}

export function getSetById(id: string) {
  const row = db
    .select({
      id: set.id,
      manufacturerId: set.manufacturerId,
      manufacturerName: manufacturer.name,
      manufacturerWebsite: manufacturer.website,
      themeId: set.themeId,
      themeName: theme.name,
      setNumber: set.setNumber,
      name: set.name,
      year: set.year,
      pieceCount: set.pieceCount,
      minifigCount: set.minifigCount,
      ean: set.ean,
      ageRange: set.ageRange,
      imageUrl: set.imageUrl,
      imagePath: set.imagePath,
      retailPriceCents: set.retailPriceCents,
      notes: set.notes,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      ownedCopies: ownedCopiesSql(set.id).mapWith(Number),
      wishlistCount: wishlistCountSql(set.id).mapWith(Number),
    })
    .from(set)
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .leftJoin(theme, eq(theme.id, set.themeId))
    .where(eq(set.id, id))
    .get();

  return row ?? null;
}

export function getSetByNumber(manufacturerId: string, setNumber: string) {
  return (
    db
      .select({ id: set.id })
      .from(set)
      .where(and(eq(set.manufacturerId, manufacturerId), eq(set.setNumber, setNumber)))
      .get() ?? null
  );
}

export function listInstructionsForSet(setId: string) {
  return db
    .select()
    .from(instruction)
    .where(eq(instruction.setId, setId))
    .orderBy(asc(instruction.sortOrder), asc(instruction.createdAt))
    .all();
}

export function listPhotosForSet(setId: string) {
  return db
    .select()
    .from(photo)
    .where(eq(photo.setId, setId))
    .orderBy(asc(photo.sortOrder), asc(photo.createdAt))
    .all();
}

export function listCollectionItemsForSet(setId: string) {
  return db
    .select()
    .from(collectionItem)
    .where(eq(collectionItem.setId, setId))
    .orderBy(desc(collectionItem.createdAt))
    .all();
}

/** Distinct release years, newest first - fills the year filter. */
export function listSetYears(): number[] {
  return db
    .selectDistinct({ year: set.year })
    .from(set)
    .where(not(sql`${set.year} is null`))
    .orderBy(desc(set.year))
    .all()
    .flatMap((row) => (row.year === null ? [] : [row.year]));
}
