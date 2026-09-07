/**
 * Money handling. Amounts live in the database as integer cents; euros only
 * exist for display and for what the user types. Every conversion goes through
 * this module.
 */

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

const decimalFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "12,99 €" - the canonical display form. */
export function formatEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '–';
  return currencyFormatter.format(cents / 100);
}

/** "12,99" - for prefilling a number input without the currency symbol. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return decimalFormatter.format(cents / 100);
}

/**
 * Parses user input into cents. Accepts both German and English decimal
 * separators as well as thousands separators, because phone keyboards differ.
 * Returns null for empty input and NaN-ish garbage.
 */
export function parseEuroInput(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  const trimmed = value.trim().replace(/[€\s]/g, '');
  if (trimmed === '') return null;

  // "1.234,56" -> "1234.56" ; "1,234.56" -> "1234.56" ; "12,99" -> "12.99"
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized: string;

  if (lastComma > lastDot) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = trimmed.replace(/,/g, '');
  } else {
    normalized = trimmed;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 100);
}

/** Sum of a list of optional cent amounts, ignoring the unknown ones. */
export function sumCents(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
