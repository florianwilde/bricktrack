import { describe, expect, it } from 'vitest';
import { describeBulkAdd, planBulkAdd, priorityLabel } from '@/lib/wishlist-logic';

describe('Mehrfachauswahl auf die Wunschliste', () => {
  it('uebernimmt alles, was weder drauf noch in der Sammlung ist', () => {
    const plan = planBulkAdd(['a', 'b', 'c'], new Set(), new Set());

    expect(plan.toAdd).toEqual(['a', 'b', 'c']);
    expect(plan.duplicates).toEqual([]);
    expect(plan.owned).toEqual([]);
  });

  it('ueberspringt Sets, die schon auf der Liste stehen', () => {
    const plan = planBulkAdd(['a', 'b', 'c'], new Set(['b']), new Set());

    expect(plan.toAdd).toEqual(['a', 'c']);
    expect(plan.duplicates).toEqual(['b']);
  });

  it('ueberspringt Sets, die schon in der Sammlung sind', () => {
    const plan = planBulkAdd(['a', 'b'], new Set(), new Set(['a']));

    expect(plan.toAdd).toEqual(['b']);
    expect(plan.owned).toEqual(['a']);
  });

  it('zaehlt ein Set, das beides ist, nur als Dublette', () => {
    const plan = planBulkAdd(['a'], new Set(['a']), new Set(['a']));

    expect(plan.toAdd).toEqual([]);
    expect(plan.duplicates).toEqual(['a']);
    expect(plan.owned).toEqual([]);
  });

  it('entfernt Mehrfachnennungen aus der Auswahl', () => {
    const plan = planBulkAdd(['a', 'a', 'b', 'a'], new Set(), new Set());

    expect(plan.toAdd).toEqual(['a', 'b']);
  });

  it('behaelt die Reihenfolge der Auswahl bei', () => {
    const plan = planBulkAdd(['c', 'a', 'b'], new Set(), new Set());

    expect(plan.toAdd).toEqual(['c', 'a', 'b']);
  });

  it('kommt mit einer leeren Auswahl klar', () => {
    const plan = planBulkAdd([], new Set(['a']), new Set(['b']));

    expect(plan).toEqual({ toAdd: [], duplicates: [], owned: [] });
  });
});

describe('Rueckmeldung nach der Mehrfachauswahl', () => {
  const names = new Map([
    ['a', '60398 Familienhaus'],
    ['b', '71427 Lloyds Drache'],
    ['c', '42172 McLaren P1'],
    ['d', '70392 Novelmore'],
    ['e', '2-30500 Mustang'],
  ]);

  it('nennt die Zahl der hinzugefuegten Sets im Singular', () => {
    const message = describeBulkAdd({ toAdd: ['a'], duplicates: [], owned: [] }, names);
    expect(message).toBe('1 Set hinzugefügt');
  });

  it('benennt uebersprungene Dubletten mit Namen', () => {
    const message = describeBulkAdd({ toAdd: ['a'], duplicates: ['b'], owned: [] }, names);

    expect(message).toContain('1 übersprungen (schon auf der Liste)');
    expect(message).toContain('71427 Lloyds Drache');
  });

  it('nennt bei vielen Dubletten nur die ersten drei', () => {
    const message = describeBulkAdd(
      { toAdd: [], duplicates: ['a', 'b', 'c', 'd', 'e'], owned: [] },
      names,
    );

    expect(message).toContain('und 2 weitere');
    expect(message).not.toContain('70392 Novelmore');
  });

  it('trennt Dubletten von bereits besessenen Sets', () => {
    const message = describeBulkAdd({ toAdd: [], duplicates: ['a'], owned: ['b'] }, names);

    expect(message).toContain('schon auf der Liste');
    expect(message).toContain('schon in der Sammlung');
  });
});

describe('Prioritaeten', () => {
  it('hat fuer jede Stufe ein deutsches Label', () => {
    expect(priorityLabel(1)).toBe('Großer Wunsch');
    expect(priorityLabel(2)).toBe('Gerne');
    expect(priorityLabel(3)).toBe('Irgendwann');
  });

  it('faellt bei unbekannten Werten auf die mittlere Stufe zurueck', () => {
    expect(priorityLabel(99)).toBe('Gerne');
  });
});
