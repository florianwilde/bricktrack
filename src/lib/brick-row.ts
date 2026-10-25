/**
 * The progress row on the dashboard: a fixed number of slots, filled with one
 * brick per share of the catalog that is already in the collection. Each
 * brick takes the colour of a collector, in proportion to what they own.
 */

export type BrickShare = { key: string; count: number };

/**
 * Returns `slots` entries: a collector key for a filled slot, `null` for an
 * empty one. Filled slots come first, grouped by collector in input order.
 */
export function brickRow(
  ownedSets: number,
  totalSets: number,
  shares: BrickShare[],
  slots = 10,
): Array<string | null> {
  const empty = Array<string | null>(slots).fill(null);
  if (totalSets <= 0 || ownedSets <= 0) return empty;

  // Never round a non-empty collection down to an empty row, and only show a
  // full row when everything is really there.
  const ratio = Math.min(ownedSets, totalSets) / totalSets;
  let filled = Math.round(ratio * slots);
  filled = Math.max(1, filled);
  if (ratio < 1) filled = Math.min(filled, slots - 1);

  const positive = shares.filter((share) => share.count > 0);
  const shareTotal = positive.reduce((sum, share) => sum + share.count, 0);
  if (shareTotal === 0) return [...Array<string | null>(filled).fill(''), ...empty].slice(0, slots);

  // Largest remainder: floor first, then hand out the rest by biggest fraction.
  const exact = positive.map((share) => (share.count / shareTotal) * filled);
  const counts = exact.map(Math.floor);
  let rest = filled - counts.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (rest === 0) break;
    counts[index]! += 1;
    rest -= 1;
  }

  const row = positive.flatMap((share, index) => Array<string>(counts[index]!).fill(share.key));
  return [...row, ...empty].slice(0, slots);
}
