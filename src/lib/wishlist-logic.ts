/**
 * Pure rules for putting sets on a wishlist. Kept free of database access so
 * they can be unit tested directly - they are the part that is easy to get
 * subtly wrong.
 */

export type BulkAddPlan = {
  /** Sets that will be inserted. */
  toAdd: string[];
  /** Already on this list - skipped, and named in the result toast. */
  duplicates: string[];
  /** Already in the collection - a wish for something he has makes no sense. */
  owned: string[];
};

/**
 * Splits a selection into the sets that actually get added and the two kinds
 * of leftovers. Input order is preserved and repeated ids collapse, so a
 * double tap in the selection UI cannot insert a set twice.
 */
export function planBulkAdd(
  selectedSetIds: readonly string[],
  existingSetIds: ReadonlySet<string>,
  ownedSetIds: ReadonlySet<string> = new Set(),
): BulkAddPlan {
  const seen = new Set<string>();
  const plan: BulkAddPlan = { toAdd: [], duplicates: [], owned: [] };

  for (const setId of selectedSetIds) {
    if (seen.has(setId)) continue;
    seen.add(setId);

    if (existingSetIds.has(setId)) plan.duplicates.push(setId);
    else if (ownedSetIds.has(setId)) plan.owned.push(setId);
    else plan.toAdd.push(setId);
  }

  return plan;
}

/** German summary for the toast after a bulk add. */
export function describeBulkAdd(plan: BulkAddPlan, names: Map<string, string>): string {
  const parts: string[] = [];

  parts.push(
    plan.toAdd.length === 1
      ? '1 Set hinzugefügt'
      : `${plan.toAdd.length} Sets hinzugefügt`,
  );

  if (plan.duplicates.length > 0) {
    parts.push(`${plan.duplicates.length} übersprungen (schon auf der Liste): ${nameList(plan.duplicates, names)}`);
  }
  if (plan.owned.length > 0) {
    parts.push(`${plan.owned.length} übersprungen (schon in der Sammlung): ${nameList(plan.owned, names)}`);
  }

  return parts.join(' · ');
}

/** Lists up to three names and summarises the rest. */
function nameList(ids: readonly string[], names: Map<string, string>): string {
  const labels = ids.map((id) => names.get(id) ?? id);
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} und ${labels.length - 3} weitere`;
}

/** 1 = highest. Used for badges and sorting. */
export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Großer Wunsch',
  2: 'Gerne',
  3: 'Irgendwann',
};

export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] ?? PRIORITY_LABELS[2]!;
}
