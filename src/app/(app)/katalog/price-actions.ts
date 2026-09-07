'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pricePoint } from '@/db/schema';
import { actionError, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { optionalDate, optionalText, optionalPriceCents } from '@/lib/validation';

const schema = z.object({
  priceCents: optionalPriceCents,
  condition: z.enum(['new', 'used']).default('new'),
  source: optionalText(80),
  observedAt: optionalDate,
  note: optionalText(200),
});

export async function addPricePoint(setId: string, input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(schema, input);
  if (!parsed.ok) return parsed;
  if (parsed.data.priceCents === null) return actionError('Bitte gib einen Preis an.');

  db.insert(pricePoint)
    .values({
      id: crypto.randomUUID(),
      setId,
      priceCents: parsed.data.priceCents,
      condition: parsed.data.condition,
      source: parsed.data.source,
      // No date given means "seen today".
      observedAt: parsed.data.observedAt ?? new Date(),
      note: parsed.data.note,
      createdAt: new Date(),
    })
    .run();

  revalidatePath(`/katalog/${setId}`);
  revalidatePath('/sammlung');
  return actionOk();
}

export async function deletePricePoint(id: string): Promise<ActionResult> {
  await requireUser();

  const existing = db
    .select({ setId: pricePoint.setId })
    .from(pricePoint)
    .where(eq(pricePoint.id, id))
    .get();
  if (!existing) return actionOk();

  db.delete(pricePoint).where(eq(pricePoint.id, id)).run();

  revalidatePath(`/katalog/${existing.setId}`);
  revalidatePath('/sammlung');
  return actionOk();
}
