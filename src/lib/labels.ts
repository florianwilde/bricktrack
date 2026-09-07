import type { CollectionStatus, Completeness, Condition, Occasion } from '@/db/types';

/** German labels for the enum values. The database keeps English keys. */

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  owned: 'Vorhanden',
  built: 'Aufgebaut',
  disassembled: 'Zerlegt',
  lent_out: 'Verliehen',
  sold: 'Verkauft',
};

export const COMPLETENESS_LABELS: Record<Completeness, string> = {
  complete: 'Vollständig',
  missing_parts: 'Teile fehlen',
  unknown: 'Unbekannt',
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new_sealed: 'Neu und versiegelt',
  like_new: 'Wie neu',
  good: 'Gut',
  used: 'Gebraucht',
  damaged: 'Beschädigt',
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  christmas: 'Weihnachten',
  birthday: 'Geburtstag',
  easter: 'Ostern',
  other: 'Anderer Anlass',
};

export function statusLabel(status: CollectionStatus): string {
  return STATUS_LABELS[status];
}

export function completenessLabel(value: Completeness): string {
  return COMPLETENESS_LABELS[value];
}

export function conditionLabel(value: Condition | null): string {
  return value ? CONDITION_LABELS[value] : '–';
}

export function occasionLabel(value: Occasion): string {
  return OCCASION_LABELS[value];
}
