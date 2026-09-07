import { describe, expect, it } from 'vitest';
import { displaySetNumber, legoInstructionsUrl, normalizeSetNumber } from '@/lib/set-number';

describe('Setnummern fuer den Rebrickable-Import', () => {
  it('haengt die Variante an, wenn nur die Packungsnummer eingetippt wurde', () => {
    expect(normalizeSetNumber('60398')).toBe('60398-1');
    expect(normalizeSetNumber('71427')).toBe('71427-1');
  });

  it('laesst eine bereits vollstaendige Nummer unveraendert', () => {
    expect(normalizeSetNumber('60398-1')).toBe('60398-1');
    expect(normalizeSetNumber('10265-2')).toBe('10265-2');
  });

  it('ignoriert Leerzeichen und vereinheitlicht Grossschreibung', () => {
    expect(normalizeSetNumber('  60398 ')).toBe('60398-1');
    expect(normalizeSetNumber('k8672')).toBe('K8672-1');
  });

  it('entfernt fuer die Anzeige nur die erste Variante', () => {
    expect(displaySetNumber('60398-1')).toBe('60398');
    // -2 ist eine echte zweite Variante und muss sichtbar bleiben.
    expect(displaySetNumber('10265-2')).toBe('10265-2');
    expect(displaySetNumber('60398')).toBe('60398');
  });

  it('ueberlebt den Rundweg Anzeige -> API -> Anzeige', () => {
    for (const number of ['60398', '71427', '42172']) {
      expect(displaySetNumber(normalizeSetNumber(number))).toBe(number);
    }
  });
});

describe('Link auf die LEGO-Bauanleitung', () => {
  it('nutzt die Nummer ohne Variante', () => {
    expect(legoInstructionsUrl('60398-1')).toBe(
      'https://www.lego.com/de-de/service/building-instructions/60398',
    );
  });

  it('maskiert Sonderzeichen in der Nummer', () => {
    expect(legoInstructionsUrl('2 30500')).toContain('2%2030500');
  });
});
