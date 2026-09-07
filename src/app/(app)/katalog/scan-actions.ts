'use server';

import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import { isValidEan } from '@/lib/ean';
import { findSetByEan } from '@/lib/queries/catalog';
import { requireUser } from '@/lib/session';

export type ScanLookup =
  | { found: true; setId: string; setNumber: string; name: string }
  | { found: false; ean: string };

/**
 * Resolves a scanned barcode.
 *
 * Either the set is already in the catalog - then we jump straight to it - or
 * it is not, and the caller opens the "new set" form with the number filled in.
 */
export async function lookupScannedEan(rawEan: unknown): Promise<ActionResult<ScanLookup>> {
  await requireUser();

  const ean = typeof rawEan === 'string' ? rawEan.replace(/\D/g, '') : '';
  if (!isValidEan(ean)) {
    return actionError('Der Strichcode wurde nicht sauber erkannt. Bitte noch einmal scannen.');
  }

  const match = findSetByEan(ean);
  if (match) {
    return actionData({
      found: true as const,
      setId: match.id,
      setNumber: match.setNumber,
      name: match.name,
    });
  }

  return actionData({ found: false as const, ean });
}
