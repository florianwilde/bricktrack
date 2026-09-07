import { sql, type SQL } from 'drizzle-orm';
import type { CollectionStatus } from '@/db/types';

/**
 * The single definition of "he has it".
 *
 * A catalog set counts as owned as soon as one collection item exists whose
 * status is anything but `sold`. A sold copy is history, not ownership - so a
 * set that was sold shows up under "fehlt" again and can go back on a wishlist.
 *
 * Every query that asks about ownership goes through this module. If the rule
 * ever changes, it changes here.
 */

export const OWNED_STATUSES = ['owned', 'built', 'disassembled', 'lent_out'] as const;

export const SOLD_STATUS: CollectionStatus = 'sold';

export type OwnedStatus = (typeof OWNED_STATUSES)[number];

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
 * SQL counterpart of `countOwnedCopies`, as a correlated subquery.
 *
 * A subquery instead of a join, because a set owned twice must not appear
 * twice in the catalog list.
 */
export function ownedCopiesSql(setIdColumn: SQL | unknown): SQL<number> {
  return sql<number>`(
    select count(*) from collection_item ci
    where ci.set_id = ${setIdColumn} and ci.status <> ${SOLD_STATUS}
  )`;
}

/** How many wishlists this set is currently on. */
export function wishlistCountSql(setIdColumn: SQL | unknown): SQL<number> {
  return sql<number>`(
    select count(*) from wishlist_item wi where wi.set_id = ${setIdColumn}
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
