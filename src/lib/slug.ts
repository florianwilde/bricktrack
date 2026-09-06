/**
 * URL-safe slug from arbitrary user input. German umlauts are spelled out
 * before the accents are stripped, so "Grün" becomes "gruen" and not "grun".
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    // Combining diacritical marks left over from the decomposition.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Appends a counter until the slug is free. `taken` holds the slugs that
 * already exist in the same table.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const existing = new Set(taken);
  const seed = slugify(base) || 'eintrag';
  if (!existing.has(seed)) return seed;

  let counter = 2;
  while (existing.has(`${seed}-${counter}`)) counter += 1;
  return `${seed}-${counter}`;
}
