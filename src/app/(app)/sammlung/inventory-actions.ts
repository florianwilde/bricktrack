'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { collectionItem, location, set } from '@/db/schema';
import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import { isValidEan, normalizeEan } from '@/lib/ean';
import type { InventoryLookup } from '@/lib/inventory';
import { ownedCopiesSql } from '@/lib/ownership';
import { findSetByEan } from '@/lib/queries/catalog';
import { defaultCollectorId, resolveCollectorId } from '@/lib/queries/collectors';
import { reconcileFulfilledWishlistItems } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';

const lookupSchema = z.object({
  eans: z.array(z.string().max(32)).min(1).max(200),
  collectorId: z.string().max(64).optional(),
});

/** Looks up a batch of scanned codes at once - an inventory sends many. */
export async function lookupInventoryCodes(input: unknown): Promise<ActionResult<InventoryLookup[]>> {
  await requireUser();

  const parsed = lookupSchema.safeParse(input);
  if (!parsed.success) return actionError('Ungültige Anfrage.');
  const collectorId = resolveCollectorId(parsed.data.collectorId);

  const results = parsed.data.eans.map((raw): InventoryLookup => {
    const ean = normalizeEan(raw);
    const match = isValidEan(ean) ? findSetByEan(ean) : null;
    if (!match) return { ean: raw, found: false };

    const owned = db
      .select({ count: ownedCopiesSql(set.id, collectorId) })
      .from(set)
      .where(eq(set.id, match.id))
      .get();
    return {
      ean: raw,
      found: true,
      setId: match.id,
      setNumber: match.setNumber,
      name: match.name,
      ownedCopies: Number(owned?.count ?? 0),
    };
  });

  return actionData(results);
}

const addSchema = z.object({
  items: z
    .array(z.object({ setId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(200),
  collectorId: z.string().max(64).optional(),
  locationId: z.string().max(64).optional(),
});

/**
 * Takes the scanned sets into the collection: one copy per counted box, all
 * with the chosen collector and storage place. Details come later, as with
 * the quick add on a set page.
 */
export async function addInventoryToCollection(
  input: unknown,
): Promise<ActionResult<{ added: number }>> {
  await requireUser();

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return actionError('Ungültige Auswahl.');
  const { items } = parsed.data;

  const known = new Set(
    db
      .select({ id: set.id })
      .from(set)
      .where(inArray(set.id, items.map((item) => item.setId)))
      .all()
      .map((row) => row.id),
  );
  if (items.some((item) => !known.has(item.setId))) {
    return actionError('Ein Set aus der Liste gibt es nicht mehr. Bitte die Liste neu prüfen.');
  }

  const collectorId = resolveCollectorId(parsed.data.collectorId) ?? defaultCollectorId();
  const locationId = parsed.data.locationId
    ? (db.select({ id: location.id }).from(location).where(eq(location.id, parsed.data.locationId)).get()
        ?.id ?? null)
    : null;

  const now = new Date();
  const rows = items.flatMap((item) =>
    Array.from({ length: item.quantity }, () => ({
      id: crypto.randomUUID(),
      setId: item.setId,
      collectorId,
      locationId,
      status: 'owned' as const,
      completeness: 'unknown' as const,
      createdAt: now,
      updatedAt: now,
    })),
  );

  db.transaction((tx) => {
    tx.insert(collectionItem).values(rows).run();
  });
  reconcileFulfilledWishlistItems();

  revalidatePath('/sammlung');
  revalidatePath('/katalog');
  revalidatePath('/wunschlisten');
  revalidatePath('/');
  return actionData({ added: rows.length });
}
