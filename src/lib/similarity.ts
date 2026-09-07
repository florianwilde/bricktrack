/**
 * Name comparison for the duplicate check when a set is created.
 *
 * Pure and free of server imports so it can be unit tested - and it needs to
 * be, because "similar enough" is a judgement call that is easy to get wrong
 * in both directions.
 */

/**
 * Lowercases, strips punctuation and collapses whitespace, so that
 * "Feuerwehr-Auto" and "feuerwehr auto" are the same string.
 */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Classic Levenshtein distance, iterative with a single row. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1]! + 1, // insertion
        previous[j]! + 1, // deletion
        previous[j - 1]! + cost, // substitution
      );
    }
    previous = current;
  }

  return previous[b.length]!;
}

/** 1 means identical, 0 means nothing in common. */
export function similarity(a: string, b: string): number {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (left === right) return 1;
  if (left.length === 0 || right.length === 0) return 0;

  const longest = Math.max(left.length, right.length);
  return 1 - levenshtein(left, right) / longest;
}

/**
 * Above this, two names are close enough to be worth asking about. Chosen so
 * that a typo or a different spelling triggers, while two genuinely different
 * sets of the same theme do not.
 */
export const SIMILAR_NAME_THRESHOLD = 0.82;

export function isSimilarName(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);

  // One name fully contained in the other ("Feuerwehrauto" vs "Feuerwehrauto
  // mit Leiter") is a strong hint even when the length differs a lot.
  if (left.length >= 6 && right.length >= 6 && (left.includes(right) || right.includes(left))) {
    return true;
  }

  return similarity(a, b) >= SIMILAR_NAME_THRESHOLD;
}
