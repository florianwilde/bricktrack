'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { collectionItem, missingPart, photo, set } from '@/db/schema';
import {
  actionData,
  actionError,
  actionOk,
  parseForm,
  type ActionResult,
} from '@/lib/action-result';
import { defaultCollectorId } from '@/lib/queries/collectors';
import { reconcileFulfilledWishlistItems } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';
import { deleteStoredFile } from '@/lib/uploads';
import { collectionItemSchema, missingPartSchema } from '@/lib/validation';
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
export async function addSetToCollection(
  setId: string,
  collectorId?: string,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const exists = db.select({ id: set.id }).from(set).where(eq(set.id, setId)).get();
  if (!exists) return actionError('Das Set gibt es nicht mehr.');

  // With a single collector nobody is asked - the copy simply belongs to them.
  const owner = collectorId ?? defaultCollectorId();

  const id = crypto.randomUUID();
  db.insert(collectionItem)
    .values({
      id,
      setId,
      collectorId: owner,
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
      collectorId: parsed.data.collectorId ?? existing.collectorId,
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

  const files = db
    .select({ path: photo.filePath, thumb: photo.thumbnailPath })
    .from(photo)
    .where(eq(photo.collectionItemId, id))
    .all()
    .flatMap((row) => [row.path, row.thumb]);

  // Rows go first (photos cascade): a file already gone must not block this.
  db.delete(collectionItem).where(eq(collectionItem.id, id)).run();
  await Promise.all(files.map((file) => deleteStoredFile(file)));
  reconcileFulfilledWishlistItems();

  revalidateCollection(existing.setId);
  return actionOk();
}

// ---------------------------------------------------------------------------
// Missing parts
// ---------------------------------------------------------------------------

/**
 * Keeps `completeness` honest without ever fighting the user.
 *
 * The moment a part is reported missing the item is not complete any more, and
 * once the last open entry is resolved it is complete again. A deliberate
 * "unknown" is left alone in the second direction only.
 */
function syncCompleteness(collectionItemId: string): void {
  const open = db
    .select({ id: missingPart.id })
    .from(missingPart)
    .where(and(eq(missingPart.collectionItemId, collectionItemId), eq(missingPart.resolved, false)))
    .all();

  const item = db
    .select({ completeness: collectionItem.completeness })
    .from(collectionItem)
    .where(eq(collectionItem.id, collectionItemId))
    .get();
  if (!item) return;

  if (open.length > 0 && item.completeness !== 'missing_parts') {
    db.update(collectionItem)
      .set({ completeness: 'missing_parts', updatedAt: now() })
      .where(eq(collectionItem.id, collectionItemId))
      .run();
    return;
  }

  if (open.length === 0 && item.completeness === 'missing_parts') {
    db.update(collectionItem)
      .set({ completeness: 'complete', updatedAt: now() })
      .where(eq(collectionItem.id, collectionItemId))
      .run();
  }
}

function loadItemSetId(collectionItemId: string): string | null {
  const row = db
    .select({ setId: collectionItem.setId })
    .from(collectionItem)
    .where(eq(collectionItem.id, collectionItemId))
    .get();
  return row?.setId ?? null;
}

export async function addMissingPart(
  collectionItemId: string,
  input: unknown,
): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(missingPartSchema, input);
  if (!parsed.ok) return parsed;

  const setId = loadItemSetId(collectionItemId);
  if (!setId) return actionError('Diesen Sammlungseintrag gibt es nicht mehr.');

  db.insert(missingPart)
    .values({
      id: crypto.randomUUID(),
      collectionItemId,
      partNumber: parsed.data.partNumber,
      colorName: parsed.data.colorName,
      quantity: parsed.data.quantity,
      resolved: false,
      notes: parsed.data.notes,
      createdAt: now(),
    })
    .run();

  syncCompleteness(collectionItemId);
  revalidateCollection(setId);
  return actionOk();
}

export async function setMissingPartResolved(
  missingPartId: string,
  resolved: boolean,
): Promise<ActionResult> {
  await requireUser();

  const row = db
    .select({ collectionItemId: missingPart.collectionItemId })
    .from(missingPart)
    .where(eq(missingPart.id, missingPartId))
    .get();
  if (!row) return actionOk();

  db.update(missingPart)
    .set({ resolved })
    .where(eq(missingPart.id, missingPartId))
    .run();

  syncCompleteness(row.collectionItemId);
  revalidateCollection(loadItemSetId(row.collectionItemId) ?? undefined);
  return actionOk();
}

/**
 * Ticks off several missing parts at once - one line of the shopping list can
 * stand for the same part in several sets.
 */
export async function resolveMissingParts(missingPartIds: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = z.array(z.string().min(1).max(64)).min(1).max(500).safeParse(missingPartIds);
  if (!parsed.success) return actionError('Ungültige Auswahl.');

  const rows = db
    .select({ collectionItemId: missingPart.collectionItemId })
    .from(missingPart)
    .where(inArray(missingPart.id, parsed.data))
    .all();
  if (rows.length === 0) return actionOk();

  db.update(missingPart)
    .set({ resolved: true })
    .where(inArray(missingPart.id, parsed.data))
    .run();

  for (const itemId of new Set(rows.map((row) => row.collectionItemId))) {
    syncCompleteness(itemId);
  }
  revalidateCollection();
  revalidatePath('/sammlung/fehlteile');
  return actionOk();
}

export async function deleteMissingPart(missingPartId: string): Promise<ActionResult> {
  await requireUser();

  const row = db
    .select({ collectionItemId: missingPart.collectionItemId })
    .from(missingPart)
    .where(eq(missingPart.id, missingPartId))
    .get();
  if (!row) return actionOk();

  db.delete(missingPart).where(eq(missingPart.id, missingPartId)).run();

  syncCompleteness(row.collectionItemId);
  revalidateCollection(loadItemSetId(row.collectionItemId) ?? undefined);
  return actionOk();
}
