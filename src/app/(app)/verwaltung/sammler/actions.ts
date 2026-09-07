'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { collectionItem, collector, wishlist } from '@/db/schema';
import { actionError, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { collectorSchema } from '@/lib/validation';

function now() {
  return new Date();
}

function revalidateEverything() {
  // A collector shows up in the catalog, the collection and the wishlists.
  revalidatePath('/', 'layout');
}

export async function createCollector(input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(collectorSchema, input);
  if (!parsed.ok) return parsed;

  const [row] = db
    .select({ next: sql<number>`coalesce(max(${collector.sortOrder}), -1) + 1`.mapWith(Number) })
    .from(collector)
    .all();

  db.insert(collector)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      color: parsed.data.color,
      birthday: parsed.data.birthday,
      notes: parsed.data.notes,
      sortOrder: row?.next ?? 0,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidateEverything();
  return actionOk();
}

export async function updateCollector(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(collectorSchema, input);
  if (!parsed.ok) return parsed;

  db.update(collector)
    .set({
      name: parsed.data.name,
      color: parsed.data.color,
      birthday: parsed.data.birthday,
      notes: parsed.data.notes,
      updatedAt: now(),
    })
    .where(eq(collector.id, id))
    .run();

  revalidateEverything();
  return actionOk();
}

/**
 * Deleting a collector would take their whole collection with it, so it is
 * only allowed while nothing is attached - and never for the last one.
 */
export async function deleteCollector(id: string): Promise<ActionResult> {
  await requireUser();

  const remaining = db.select({ id: collector.id }).from(collector).all();
  if (remaining.length <= 1) {
    return actionError('Der letzte Sammler kann nicht gelöscht werden.');
  }

  const owned = db
    .select({ id: collectionItem.id })
    .from(collectionItem)
    .where(eq(collectionItem.collectorId, id))
    .get();
  if (owned) {
    return actionError(
      'Diesem Sammler sind noch Sets zugeordnet. Ordne sie erst jemand anderem zu, dann lässt er sich löschen.',
    );
  }

  const lists = db
    .select({ id: wishlist.id })
    .from(wishlist)
    .where(eq(wishlist.collectorId, id))
    .get();
  if (lists) {
    return actionError(
      'Zu diesem Sammler gibt es noch Wunschlisten. Ordne sie erst um oder lösch sie.',
    );
  }

  db.delete(collector).where(eq(collector.id, id)).run();

  revalidateEverything();
  return actionOk();
}

/** Moves every owned copy of one collector over to another. */
export async function reassignCollectionItems(
  fromCollectorId: string,
  toCollectorId: string,
): Promise<ActionResult> {
  await requireUser();

  if (fromCollectorId === toCollectorId) return actionOk();

  const target = db
    .select({ id: collector.id })
    .from(collector)
    .where(eq(collector.id, toCollectorId))
    .get();
  if (!target) return actionError('Diesen Sammler gibt es nicht.');

  db.update(collectionItem)
    .set({ collectorId: toCollectorId, updatedAt: now() })
    .where(eq(collectionItem.collectorId, fromCollectorId))
    .run();

  revalidateEverything();
  return actionOk();
}

/** Reorders the collectors; the first one is the default for new entries. */
export async function reorderCollectors(orderedIds: string[]): Promise<ActionResult> {
  await requireUser();

  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(collector)
        .set({ sortOrder: index, updatedAt: now() })
        .where(eq(collector.id, id))
        .run();
    });
  });

  revalidateEverything();
  return actionOk();
}

/** Every collector, ordered - for the selects in the forms. */
export async function listCollectorOptions(): Promise<Array<{ id: string; name: string }>> {
  await requireUser();

  return db
    .select({ id: collector.id, name: collector.name })
    .from(collector)
    .orderBy(asc(collector.sortOrder), asc(collector.name))
    .all();
}
