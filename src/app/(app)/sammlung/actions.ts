'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { collectionItem, set } from '@/db/schema';
import {
  actionData,
  actionError,
  actionOk,
  parseForm,
  type ActionResult,
} from '@/lib/action-result';
import { reconcileFulfilledWishlistItems } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';
import { collectionItemSchema } from '@/lib/validation';
import type { Condition } from '@/db/types';

function now() {
  return new Date();
}

function revalidateCollection(setId?: string) {
  revalidatePath('/sammlung');
  revalidatePath('/katalog');
  revalidatePath('/wunschlisten');
  revalidatePath('/');
  if (setId) revalidatePath(`/katalog/${setId}`);
}

/**
 * Quick add from the set detail page: one tap, sensible defaults, details can
 * be filled in later.
 */
export async function addSetToCollection(setId: string): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const exists = db.select({ id: set.id }).from(set).where(eq(set.id, setId)).get();
  if (!exists) return actionError('Das Set gibt es nicht mehr.');

  const id = crypto.randomUUID();
  db.insert(collectionItem)
    .values({
      id,
      setId,
      status: 'owned',
      completeness: 'unknown',
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  // A wish that just came true is marked as fulfilled right away.
  reconcileFulfilledWishlistItems();

  revalidateCollection(setId);
  return actionData({ id });
}

export async function updateCollectionItem(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(collectionItemSchema, input);
  if (!parsed.ok) return parsed;

  const existing = db.select().from(collectionItem).where(eq(collectionItem.id, id)).get();
  if (!existing) return actionError('Dieser Sammlungseintrag gibt es nicht mehr.');

  db.update(collectionItem)
    .set({
      status: parsed.data.status,
      completeness: parsed.data.completeness,
      condition: parsed.data.condition as Condition | null,
      locationId: parsed.data.locationId,
      acquiredAt: parsed.data.acquiredAt,
      acquiredPriceCents: parsed.data.acquiredPriceCents,
      acquiredFrom: parsed.data.acquiredFrom,
      giftedBy: parsed.data.giftedBy,
      lentOutTo: parsed.data.lentOutTo,
      notes: parsed.data.notes,
      updatedAt: now(),
    })
    .where(eq(collectionItem.id, id))
    .run();

  // Selling the last copy puts the set back into "fehlt" - and back onto the
  // wishlists as an open wish.
  reconcileFulfilledWishlistItems();

  revalidateCollection(existing.setId);
  return actionOk();
}

export async function deleteCollectionItem(id: string): Promise<ActionResult> {
  await requireUser();

  const existing = db.select().from(collectionItem).where(eq(collectionItem.id, id)).get();
  if (!existing) return actionOk();

  db.delete(collectionItem).where(eq(collectionItem.id, id)).run();
  reconcileFulfilledWishlistItems();

  revalidateCollection(existing.setId);
  return actionOk();
}
