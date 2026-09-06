'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { set, wishlist, wishlistItem } from '@/db/schema';
import {
  actionData,
  actionError,
  actionOk,
  parseForm,
  type ActionResult,
} from '@/lib/action-result';
import { ownedCopiesSql } from '@/lib/ownership';
import {
  findExistingWishlistSetIds,
  getWishlist,
  nextWishlistSortOrder,
} from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';
import { createToken } from '@/lib/tokens';
import { describeBulkAdd, planBulkAdd } from '@/lib/wishlist-logic';
import {
  addSetsToWishlistSchema,
  wishlistItemSchema,
  wishlistSchema,
} from '@/lib/validation';

function now() {
  return new Date();
}

function revalidateWishlist(id?: string) {
  revalidatePath('/wunschlisten');
  revalidatePath('/katalog');
  if (id) revalidatePath(`/wunschlisten/${id}`);
}

/** Every wishlist action first proves the current user owns the list. */
async function requireOwnedWishlist(id: string) {
  const user = await requireUser();
  const list = getWishlist(id);
  if (!list || list.ownerUserId !== user.id) return null;
  return list;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function createWishlist(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = parseForm(wishlistSchema, input);
  if (!parsed.ok) return parsed;

  const id = crypto.randomUUID();
  db.insert(wishlist)
    .values({
      id,
      ownerUserId: user.id,
      title: parsed.data.title,
      occasion: parsed.data.occasion,
      eventDate: parsed.data.eventDate,
      note: parsed.data.note,
      isPublic: parsed.data.isPublic,
      surpriseMode: parsed.data.surpriseMode,
      shareToken: createToken(),
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidateWishlist(id);
  return actionData({ id });
}

export async function updateWishlist(id: string, input: unknown): Promise<ActionResult> {
  const list = await requireOwnedWishlist(id);
  if (!list) return actionError('Diese Wunschliste gibt es nicht.');

  const parsed = parseForm(wishlistSchema, input);
  if (!parsed.ok) return parsed;

  db.update(wishlist)
    .set({
      title: parsed.data.title,
      occasion: parsed.data.occasion,
      eventDate: parsed.data.eventDate,
      note: parsed.data.note,
      isPublic: parsed.data.isPublic,
      surpriseMode: parsed.data.surpriseMode,
      updatedAt: now(),
    })
    .where(eq(wishlist.id, id))
    .run();

  revalidateWishlist(id);
  return actionOk();
}

export async function deleteWishlist(id: string): Promise<ActionResult> {
  const list = await requireOwnedWishlist(id);
  if (!list) return actionError('Diese Wunschliste gibt es nicht.');

  db.delete(wishlist).where(eq(wishlist.id, id)).run();
  revalidateWishlist(id);
  return actionOk();
}

/**
 * Issues a fresh share token. The old link stops working immediately - the way
 * out when a list was shared with the wrong people.
 */
export async function rotateShareToken(id: string): Promise<ActionResult<{ token: string }>> {
  const list = await requireOwnedWishlist(id);
  if (!list) return actionError('Diese Wunschliste gibt es nicht.');

  const token = createToken();
  db.update(wishlist)
    .set({ shareToken: token, updatedAt: now() })
    .where(eq(wishlist.id, id))
    .run();

  revalidateWishlist(id);
  return actionData({ token });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * The central path from "fehlende Sets" onto a wishlist.
 *
 * Sets that are already on the list are skipped and named in the result, and
 * so are sets that are already in the collection. The unique index on
 * (wishlist_id, set_id) makes that a guarantee rather than a hope.
 */
export async function addSetsToWishlist(
  input: unknown,
): Promise<ActionResult<{ added: number; message: string }>> {
  await requireUser();

  const parsed = parseForm(addSetsToWishlistSchema, input);
  if (!parsed.ok) return parsed;

  const list = await requireOwnedWishlist(parsed.data.wishlistId);
  if (!list) return actionError('Diese Wunschliste gibt es nicht.');

  const setIds = parsed.data.setIds;
  const known = db
    .select({
      id: set.id,
      name: set.name,
      setNumber: set.setNumber,
      ownedCopies: ownedCopiesSql(set.id).mapWith(Number),
    })
    .from(set)
    .where(inArray(set.id, setIds))
    .all();

  if (known.length === 0) return actionError('Die ausgewählten Sets gibt es nicht mehr.');

  const names = new Map(known.map((row) => [row.id, `${row.setNumber} ${row.name}`]));
  const ownedSetIds = new Set(known.filter((row) => row.ownedCopies > 0).map((row) => row.id));
  const existing = findExistingWishlistSetIds(list.id, setIds);

  const plan = planBulkAdd(
    setIds.filter((id) => names.has(id)),
    existing,
    ownedSetIds,
  );

  if (plan.toAdd.length > 0) {
    let sortOrder = nextWishlistSortOrder(list.id);
    db.insert(wishlistItem)
      .values(
        plan.toAdd.map((setId) => ({
          id: crypto.randomUUID(),
          wishlistId: list.id,
          setId,
          priority: parsed.data.priority,
          sortOrder: sortOrder++,
          createdAt: now(),
        })),
      )
      // Belt and braces: a concurrent add must not blow up the whole batch.
      .onConflictDoNothing()
      .run();
  }

  revalidateWishlist(list.id);
  return actionData({ added: plan.toAdd.length, message: describeBulkAdd(plan, names) });
}

export async function updateWishlistItem(itemId: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseForm(wishlistItemSchema, input);
  if (!parsed.ok) return parsed;

  const item = db
    .select({ id: wishlistItem.id, wishlistId: wishlistItem.wishlistId })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(and(eq(wishlistItem.id, itemId), eq(wishlist.ownerUserId, user.id)))
    .get();
  if (!item) return actionError('Dieser Eintrag gehört nicht zu deinen Wunschlisten.');

  db.update(wishlistItem)
    .set({ priority: parsed.data.priority, note: parsed.data.note })
    .where(eq(wishlistItem.id, itemId))
    .run();

  revalidateWishlist(item.wishlistId);
  return actionOk();
}

export async function removeWishlistItem(itemId: string): Promise<ActionResult> {
  const user = await requireUser();

  const item = db
    .select({ id: wishlistItem.id, wishlistId: wishlistItem.wishlistId })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(and(eq(wishlistItem.id, itemId), eq(wishlist.ownerUserId, user.id)))
    .get();
  if (!item) return actionOk();

  db.delete(wishlistItem).where(eq(wishlistItem.id, itemId)).run();

  revalidateWishlist(item.wishlistId);
  return actionOk();
}

/** Persists the order after drag and drop or the move buttons. */
export async function reorderWishlistItems(
  wishlistId: string,
  orderedItemIds: string[],
): Promise<ActionResult> {
  const list = await requireOwnedWishlist(wishlistId);
  if (!list) return actionError('Diese Wunschliste gibt es nicht.');

  db.transaction((tx) => {
    orderedItemIds.forEach((itemId, index) => {
      tx.update(wishlistItem)
        .set({ sortOrder: index })
        .where(and(eq(wishlistItem.id, itemId), eq(wishlistItem.wishlistId, wishlistId)))
        .run();
    });
  });

  revalidateWishlist(wishlistId);
  return actionOk();
}
