import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/** dd.MM.yyyy - the only date format used in the UI. */
export function formatDate(value: Date | number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return format(value, 'dd.MM.yyyy');
}

export function formatDateTime(value: Date | number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return format(value, 'dd.MM.yyyy, HH:mm', { locale: de });
}

/** Value for an <input type="date">, which always expects ISO. */
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return '';
  return format(value, 'yyyy-MM-dd');
}

const numberFormatter = new Intl.NumberFormat('de-DE');

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return numberFormatter.format(value);
}

/** "1 Set" / "12 Sets" - German plural for the few nouns we count. */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
