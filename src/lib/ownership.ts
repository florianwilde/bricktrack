import { sql, type SQL } from 'drizzle-orm';
import type { CollectionStatus } from '@/db/types';

/**
 * The single definition of "he has it".
 *
 * A catalog set counts as owned as soon as one collection item exists whose
 * status is anything but `sold`. A sold copy is history, not ownership - so a
 * set that was sold shows up under "fehlt" again and can go back on a wishlist.
 *
 * With more than one collector the question gains a "for whom": the catalog is
 * shared, ownership is not. Every query that asks about ownership goes through
 * this module, optionally scoped to one collector.
 */

export const OWNED_STATUSES = ['owned', 'built', 'disassembled', 'lent_out'] as const;

export const SOLD_STATUS: CollectionStatus = 'sold';

export type OwnedStatus = (typeof OWNED_STATUSES)[number];

/** One owned copy, as far as ownership is concerned. */
export type OwnableCopy = {
  status: CollectionStatus;
  collectorId?: string | null;
};

/** Does a single collection item count towards ownership? */
export function isOwningStatus(status: CollectionStatus): status is OwnedStatus {
  return status !== SOLD_STATUS;
}

/**
 * Does a set count as owned, given the statuses of all its collection items?
 * An empty list means the set is only in the catalog.
 */
export function isSetOwned(statuses: readonly CollectionStatus[]): boolean {
  return statuses.some(isOwningStatus);
}

/** How many copies count as owned. Several rows for one set are allowed. */
export function countOwnedCopies(statuses: readonly CollectionStatus[]): number {
  return statuses.filter(isOwningStatus).length;
}

/**
 * Ownership from the point of view of one collector.
 *
 * Without a collector the question is "does anyone here have it", which is
 * what a single-collector household asks anyway.
 */
export function countOwnedCopiesFor(
  copies: readonly OwnableCopy[],
  collectorId?: string | null,
): number {
  return copies.filter(
    (copy) =>
      isOwningStatus(copy.status) &&
      (collectorId === undefined || collectorId === null || copy.collectorId === collectorId),
  ).length;
}

export function isSetOwnedBy(
  copies: readonly OwnableCopy[],
  collectorId?: string | null,
): boolean {
  return countOwnedCopiesFor(copies, collectorId) > 0;
}

/**
 * SQL counterpart of `countOwnedCopiesFor`, as a correlated subquery.
 *
 * A subquery instead of a join, because a set owned twice must not appear
 * twice in the catalog list.
 */
export function ownedCopiesSql(
  setIdColumn: SQL | unknown,
  collectorId?: string | null,
): SQL<number> {
  if (!collectorId) {
    return sql<number>`(
      select count(*) from collection_item ci
      where ci.set_id = ${setIdColumn} and ci.status <> ${SOLD_STATUS}
    )`;
  }

  return sql<number>`(
    select count(*) from collection_item ci
    where ci.set_id = ${setIdColumn}
      and ci.status <> ${SOLD_STATUS}
      and ci.collector_id = ${collectorId}
  )`;
}

/**
 * How many wishlists this set is on. Scoped to a collector where one is
 * selected - a set on the other child's list is not "already wished for" here.
 */
export function wishlistCountSql(
  setIdColumn: SQL | unknown,
  collectorId?: string | null,
): SQL<number> {
  if (!collectorId) {
    return sql<number>`(
      select count(*) from wishlist_item wi where wi.set_id = ${setIdColumn}
    )`;
  }

  return sql<number>`(
    select count(*) from wishlist_item wi
    join wishlist w on w.id = wi.wishlist_id
    where wi.set_id = ${setIdColumn} and w.collector_id = ${collectorId}
  )`;
}

/** The four states the catalog filter offers, as they appear in the URL. */
export const OWNERSHIP_FILTERS = ['alle', 'sammlung', 'fehlt', 'wunschliste'] as const;

export type OwnershipFilter = (typeof OWNERSHIP_FILTERS)[number];

export function parseOwnershipFilter(value: string | undefined | null): OwnershipFilter {
  return OWNERSHIP_FILTERS.includes(value as OwnershipFilter)
    ? (value as OwnershipFilter)
    : 'alle';
}

export const OWNERSHIP_FILTER_LABELS: Record<OwnershipFilter, string> = {
  alle: 'Alle Sets',
  sammlung: 'In der Sammlung',
  fehlt: 'Fehlt noch',
  wunschliste: 'Auf einer Wunschliste',
};
