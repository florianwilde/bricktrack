/**
 * Barcode helpers.
 *
 * Kept free of server-only imports so both the scanner in the browser and the
 * lookup on the server use the very same rules.
 */

/** Digits only - scanners and humans disagree about spaces and dashes. */
export function normalizeEan(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Checks an EAN-8, EAN-13 or UPC-A against its check digit.
 *
 * Worth doing: a camera occasionally reads a digit wrong, and without this a
 * misread would silently create a second catalog entry for a set that is
 * already there.
 */
export function isValidEan(input: string): boolean {
  const digits = normalizeEan(input);
  if (![8, 12, 13].includes(digits.length)) return false;

  // From the right: every second digit counts three times.
  const checkDigit = Number(digits[digits.length - 1]);
  const body = digits.slice(0, -1);

  let sum = 0;
  for (let index = body.length - 1, weight = 3; index >= 0; index -= 1, weight = weight === 3 ? 1 : 3) {
    sum += Number(body[index]) * weight;
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}

/** "4005556603985" -> "4 005556 603985" for readable display. */
export function formatEan(input: string): string {
  const digits = normalizeEan(input);
  if (digits.length !== 13) return digits;
  return `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7)}`;
}
