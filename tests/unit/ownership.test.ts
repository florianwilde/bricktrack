import { describe, expect, it } from 'vitest';
import type { CollectionStatus } from '@/db/types';
import {
  countOwnedCopies,
  countOwnedCopiesFor,
  isOwningStatus,
  isSetOwned,
  isSetOwnedBy,
  OWNED_STATUSES,
  parseOwnershipFilter,
} from '@/lib/ownership';

describe('Besitzstatus', () => {
  it('zaehlt jeden Status ausser sold als Besitz', () => {
    for (const status of OWNED_STATUSES) {
      expect(isOwningStatus(status)).toBe(true);
    }
    expect(isOwningStatus('sold')).toBe(false);
  });

  it('gilt ohne Sammlungseintrag als nicht vorhanden', () => {
    expect(isSetOwned([])).toBe(false);
  });

  it('gilt als vorhanden, sobald ein Exemplar nicht verkauft ist', () => {
    expect(isSetOwned(['owned'])).toBe(true);
    expect(isSetOwned(['built'])).toBe(true);
    expect(isSetOwned(['disassembled'])).toBe(true);
    expect(isSetOwned(['lent_out'])).toBe(true);
  });

  it('gilt als fehlend, wenn alle Exemplare verkauft sind', () => {
    expect(isSetOwned(['sold'])).toBe(false);
    expect(isSetOwned(['sold', 'sold'])).toBe(false);
  });

  it('gilt als vorhanden, wenn ein Exemplar verkauft und eines geblieben ist', () => {
    const statuses: CollectionStatus[] = ['sold', 'built'];
    expect(isSetOwned(statuses)).toBe(true);
  });

  it('zaehlt nur die nicht verkauften Exemplare', () => {
    expect(countOwnedCopies(['owned', 'owned', 'sold'])).toBe(2);
    expect(countOwnedCopies(['sold'])).toBe(0);
    expect(countOwnedCopies([])).toBe(0);
  });
});

describe('Besitz-Filter aus der URL', () => {
  it('erkennt die vier gueltigen Werte', () => {
    expect(parseOwnershipFilter('alle')).toBe('alle');
    expect(parseOwnershipFilter('sammlung')).toBe('sammlung');
    expect(parseOwnershipFilter('fehlt')).toBe('fehlt');
    expect(parseOwnershipFilter('wunschliste')).toBe('wunschliste');
  });

  it('faellt bei Unsinn auf "alle" zurueck', () => {
    expect(parseOwnershipFilter('quatsch')).toBe('alle');
    expect(parseOwnershipFilter(undefined)).toBe('alle');
    expect(parseOwnershipFilter(null)).toBe('alle');
    expect(parseOwnershipFilter('')).toBe('alle');
  });
});

describe('Besitz je Sammler', () => {
  const copies = [
    { status: 'built' as const, collectorId: 'max' },
    { status: 'owned' as const, collectorId: 'mia' },
    { status: 'sold' as const, collectorId: 'max' },
  ];

  it('zaehlt ohne Sammler alles, was irgendjemand hier hat', () => {
    expect(countOwnedCopiesFor(copies)).toBe(2);
    expect(isSetOwnedBy(copies)).toBe(true);
  });

  it('zaehlt mit Sammler nur dessen Exemplare', () => {
    expect(countOwnedCopiesFor(copies, 'max')).toBe(1);
    expect(countOwnedCopiesFor(copies, 'mia')).toBe(1);
  });

  it('sieht ein Set als fehlend, wenn nur das Geschwisterkind es hat', () => {
    const onlyMia = [{ status: 'built' as const, collectorId: 'mia' }];

    expect(isSetOwnedBy(onlyMia, 'mia')).toBe(true);
    // Genau der Fall, fuer den es mehrere Sammler gibt.
    expect(isSetOwnedBy(onlyMia, 'max')).toBe(false);
  });

  it('ignoriert verkaufte Exemplare auch je Sammler', () => {
    const sold = [{ status: 'sold' as const, collectorId: 'max' }];

    expect(isSetOwnedBy(sold, 'max')).toBe(false);
    expect(isSetOwnedBy(sold)).toBe(false);
  });

  it('behandelt einen unbekannten Sammler als "hat nichts"', () => {
    expect(countOwnedCopiesFor(copies, 'niemand')).toBe(0);
  });

  it('kommt mit Exemplaren ohne Sammler klar', () => {
    const unassigned = [{ status: 'owned' as const, collectorId: null }];

    expect(isSetOwnedBy(unassigned)).toBe(true);
    expect(isSetOwnedBy(unassigned, 'max')).toBe(false);
  });
});
