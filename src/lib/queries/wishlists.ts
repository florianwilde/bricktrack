import 'server-only';
import { and, asc, count, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { manufacturer, set, theme, wishlist, wishlistItem } from '@/db/schema';
import { ownedCopiesSql } from '@/lib/ownership';

/** Short list for the "auf welche Wunschliste?" dialogs. */
export function listWishlistTargets() {
  return db
    .select({
      id: wishlist.id,
      title: wishlist.title,
      itemCount: count(wishlistItem.id),
    })
    .from(wishlist)
    .leftJoin(wishlistItem, eq(wishlistItem.wishlistId, wishlist.id))
    .groupBy(wishlist.id)
    .orderBy(asc(wishlist.title))
    .all();
}

export function listWishlists(ownerUserId: string) {
  const openItems = sql<number>`(
    select count(*) from wishlist_item wi
    where wi.wishlist_id = ${wishlist.id} and wi.reserved_at is null and wi.fulfilled_at is null
  )`.mapWith(Number);

  return db
    .select({
      id: wishlist.id,
      title: wishlist.title,
      occasion: wishlist.occasion,
      eventDate: wishlist.eventDate,
      isPublic: wishlist.isPublic,
      surpriseMode: wishlist.surpriseMode,
      shareToken: wishlist.shareToken,
      createdAt: wishlist.createdAt,
      itemCount: count(wishlistItem.id),
      openCount: openItems,
    })
    .from(wishlist)
    .leftJoin(wishlistItem, eq(wishlistItem.wishlistId, wishlist.id))
    .where(eq(wishlist.ownerUserId, ownerUserId))
    .groupBy(wishlist.id)
    .orderBy(asc(wishlist.title))
    .all();
}

export function getWishlist(id: string) {
  return db.select().from(wishlist).where(eq(wishlist.id, id)).get() ?? null;
}

export function getWishlistByShareToken(shareToken: string) {
  return db.select().from(wishlist).where(eq(wishlist.shareToken, shareToken)).get() ?? null;
}

export type WishlistItemRow = {
  id: string;
  setId: string;
  priority: number;
  note: string | null;
  sortOrder: number;
  reservedByName: string | null;
  reservedAt: Date | null;
  fulfilledAt: Date | null;
  setNumber: string;
  setName: string;
  year: number | null;
  pieceCount: number | null;
  imageUrl: string | null;
  imagePath: string | null;
  retailPriceCents: number | null;
  manufacturerName: string;
  manufacturerWebsite: string | null;
  themeName: string | null;
  ownedCopies: number;
};

export function listWishlistItems(wishlistId: string): WishlistItemRow[] {
  return db
    .select({
      id: wishlistItem.id,
      setId: wishlistItem.setId,
      priority: wishlistItem.priority,
      note: wishlistItem.note,
      sortOrder: wishlistItem.sortOrder,
      reservedByName: wishlistItem.reservedByName,
      reservedAt: wishlistItem.reservedAt,
      fulfilledAt: wishlistItem.fulfilledAt,
      setNumber: set.setNumber,
      setName: set.name,
      year: set.year,
      pieceCount: set.pieceCount,
      imageUrl: set.imageUrl,
      imagePath: set.imagePath,
      retailPriceCents: set.retailPriceCents,
      manufacturerName: manufacturer.name,
      manufacturerWebsite: manufacturer.website,
      themeName: theme.name,
      ownedCopies: ownedCopiesSql(set.id).mapWith(Number),
    })
    .from(wishlistItem)
    .innerJoin(set, eq(set.id, wishlistItem.setId))
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .leftJoin(theme, eq(theme.id, set.themeId))
    .where(eq(wishlistItem.wishlistId, wishlistId))
    .orderBy(asc(wishlistItem.sortOrder), asc(wishlistItem.priority), asc(set.name))
    .all();
}

/** Which of these sets are already on the list - drives the duplicate skip. */
export function findExistingWishlistSetIds(wishlistId: string, setIds: string[]): Set<string> {
  if (setIds.length === 0) return new Set();

  const rows = db
    .select({ setId: wishlistItem.setId })
    .from(wishlistItem)
    .where(and(eq(wishlistItem.wishlistId, wishlistId), inArray(wishlistItem.setId, setIds)))
    .all();

  return new Set(rows.map((row) => row.setId));
}

export function nextWishlistSortOrder(wishlistId: string): number {
  const rows = db
    .select({ sortOrder: wishlistItem.sortOrder })
    .from(wishlistItem)
    .where(eq(wishlistItem.wishlistId, wishlistId))
    .all();
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

/** Wishlists a set appears on - shown on the set detail page. */
export function listWishlistsForSet(setId: string) {
  return db
    .select({ id: wishlist.id, title: wishlist.title, itemId: wishlistItem.id })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(eq(wishlistItem.setId, setId))
    .orderBy(asc(wishlist.title))
    .all();
}

/**
 * Marks wishlist entries as fulfilled once the set is in the collection, and
 * clears the flag again if the copy was sold. Called after every change to the
 * collection, so the lists stay honest without a background job.
 */
export function reconcileFulfilledWishlistItems(): void {
  const owned = ownedCopiesSql(wishlistItem.setId);

  db.update(wishlistItem)
    .set({ fulfilledAt: new Date() })
    .where(and(isNull(wishlistItem.fulfilledAt), sql`${owned} > 0`))
    .run();

  db.update(wishlistItem)
    .set({ fulfilledAt: null })
    .where(and(isNotNull(wishlistItem.fulfilledAt), sql`${owned} = 0`))
    .run();
}
