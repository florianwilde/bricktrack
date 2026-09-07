'use server';

import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { manufacturer, set } from '@/db/schema';
import { actionData, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { isSimilarName } from '@/lib/similarity';

export type DuplicateCandidate = {
  id: string;
  setNumber: string;
  name: string;
  manufacturerName: string;
  /** Why we are showing it. */
  reason: 'same-number' | 'similar-name' | 'number-elsewhere';
};

/**
 * Looks for sets that the one being created might be a duplicate of.
 *
 * Three cases, in descending order of certainty:
 *  - the same number at the same manufacturer (that is a real duplicate and is
 *    rejected on save anyway),
 *  - a suspiciously similar name at the same manufacturer,
 *  - the same number at a different manufacturer, which usually means the
 *    wrong manufacturer was selected.
 */
export async function findDuplicateCandidates(input: {
  manufacturerId: string;
  setNumber: string;
  name: string;
  excludeSetId?: string;
}): Promise<ActionResult<{ candidates: DuplicateCandidate[] }>> {
  await requireUser();

  const setNumber = input.setNumber?.trim() ?? '';
  const name = input.name?.trim() ?? '';
  if (!input.manufacturerId || (setNumber === '' && name === '')) {
    return actionData({ candidates: [] });
  }

  const rows = db
    .select({
      id: set.id,
      setNumber: set.setNumber,
      name: set.name,
      manufacturerId: set.manufacturerId,
      manufacturerName: manufacturer.name,
    })
    .from(set)
    .innerJoin(manufacturer, eq(manufacturer.id, set.manufacturerId))
    .where(input.excludeSetId ? ne(set.id, input.excludeSetId) : undefined)
    .all();

  const candidates: DuplicateCandidate[] = [];

  for (const row of rows) {
    const sameManufacturer = row.manufacturerId === input.manufacturerId;
    const sameNumber = setNumber !== '' && row.setNumber.toLowerCase() === setNumber.toLowerCase();

    if (sameManufacturer && sameNumber) {
      candidates.push({ ...row, reason: 'same-number' });
      continue;
    }
    if (sameManufacturer && name !== '' && isSimilarName(row.name, name)) {
      candidates.push({ ...row, reason: 'similar-name' });
      continue;
    }
    if (!sameManufacturer && sameNumber) {
      candidates.push({ ...row, reason: 'number-elsewhere' });
    }
  }

  // Certain matches first, and never more than a handful.
  const order: Record<DuplicateCandidate['reason'], number> = {
    'same-number': 0,
    'similar-name': 1,
    'number-elsewhere': 2,
  };
  candidates.sort((a, b) => order[a.reason] - order[b.reason]);

  return actionData({ candidates: candidates.slice(0, 5) });
}

/** Used by the import to point at an existing entry instead of failing blindly. */
export async function findSetByNumber(
  manufacturerId: string,
  setNumber: string,
): Promise<ActionResult<{ id: string } | null>> {
  await requireUser();

  const row = db
    .select({ id: set.id })
    .from(set)
    .where(and(eq(set.manufacturerId, manufacturerId), eq(set.setNumber, setNumber)))
    .get();

  return actionData(row ?? null);
}
