'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { wishlist, wishlistItem } from '@/db/schema';
import { actionData, actionError, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { createToken, hashToken, tokensMatch } from '@/lib/tokens';
import { reservationSchema } from '@/lib/validation';

/**
 * Actions for the public wishlist page.
 *
 * These run without a session. The share token is the only key, and every
 * query is scoped by it - nothing outside the one wishlist is reachable, and
 * nothing but wishlist data is returned.
 */

function loadPublicList(shareToken: string) {
  const list = db
    .select({ id: wishlist.id, isPublic: wishlist.isPublic })
    .from(wishlist)
    .where(eq(wishlist.shareToken, shareToken))
    .get();

  return list && list.isPublic ? list : null;
}

export async function reserveItem(
  shareToken: string,
  input: unknown,
): Promise<ActionResult<{ cancelToken: string }>> {
  const list = loadPublicList(shareToken);
  if (!list) return actionError('Diese Wunschliste ist nicht mehr erreichbar.');

  const parsed = parseForm(reservationSchema, input);
  if (!parsed.ok) return parsed;

  const cancelToken = createToken();

  // The `reserved_at is null` condition makes this a claim, not a read-then-write:
  // if two people tap at the same moment, only the first one wins.
  const result = db
    .update(wishlistItem)
    .set({
      reservedByName: parsed.data.name,
      reservedAt: new Date(),
      reservationTokenHash: hashToken(cancelToken),
    })
    .where(
      and(
        eq(wishlistItem.id, parsed.data.itemId),
        eq(wishlistItem.wishlistId, list.id),
        isNull(wishlistItem.reservedAt),
      ),
    )
    .run();

  if (result.changes === 0) {
    return actionError('Dieser Wunsch ist gerade eben schon von jemand anderem übernommen worden.');
  }

  revalidatePath(`/w/${shareToken}`);
  return actionData({ cancelToken });
}

export async function cancelReservation(
  shareToken: string,
  itemId: string,
  cancelToken: string,
): Promise<ActionResult> {
  const list = loadPublicList(shareToken);
  if (!list) return actionError('Diese Wunschliste ist nicht mehr erreichbar.');

  const item = db
    .select({ id: wishlistItem.id, hash: wishlistItem.reservationTokenHash })
    .from(wishlistItem)
    .where(and(eq(wishlistItem.id, itemId), eq(wishlistItem.wishlistId, list.id)))
    .get();

  if (!item) return actionError('Diesen Eintrag gibt es nicht mehr.');
  if (!tokensMatch(cancelToken, item.hash)) {
    return actionError('Dieser Link passt nicht zu der Reservierung.');
  }

  db.update(wishlistItem)
    .set({ reservedByName: null, reservedAt: null, reservationTokenHash: null })
    .where(eq(wishlistItem.id, itemId))
    .run();

  revalidatePath(`/w/${shareToken}`);
  return actionOk();
}
