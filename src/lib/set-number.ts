/**
 * Set-number handling for the Lego import.
 *
 * Deliberately free of server-only imports so it can be unit tested and, if
 * ever needed, used on the client.
 */

/**
 * Rebrickable numbers a set's variant explicitly: the box says "60398", the
 * API knows "60398-1". People type what is printed on the box, so the suffix
 * is added when it is missing.
 */
export function normalizeSetNumber(input: string): string {
  const trimmed = input.trim().toUpperCase();
  return /-\d+$/.test(trimmed) ? trimmed : `${trimmed}-1`;
}

/** The number as it should be stored and shown: without the "-1" variant. */
export function displaySetNumber(setNum: string): string {
  return setNum.trim().replace(/-1$/, '');
}

/**
 * Lego publishes building instructions per set number. Rebrickable's API does
 * not expose instruction files, so the import links to Lego's own service page
 * rather than pretending to have the PDF.
 */
export function legoInstructionsUrl(setNumber: string): string {
  return `https://www.lego.com/de-de/service/building-instructions/${encodeURIComponent(
    displaySetNumber(setNumber),
  )}`;
}
