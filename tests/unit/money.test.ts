import { describe, expect, it } from 'vitest';
import { centsToInput, formatEuro, parseEuroInput, sumCents } from '@/lib/money';

describe('Preiseingabe nach Cent', () => {
  it('versteht das deutsche Komma', () => {
    expect(parseEuroInput('12,99')).toBe(1299);
    expect(parseEuroInput('0,05')).toBe(5);
  });

  it('versteht den englischen Punkt', () => {
    expect(parseEuroInput('12.99')).toBe(1299);
  });

  it('versteht Tausendertrennzeichen in beiden Schreibweisen', () => {
    expect(parseEuroInput('1.234,56')).toBe(123456);
    expect(parseEuroInput('1,234.56')).toBe(123456);
  });

  it('ignoriert Euro-Zeichen und Leerzeichen', () => {
    expect(parseEuroInput(' 89,99 € ')).toBe(8999);
  });

  it('liefert null fuer leere Eingaben', () => {
    expect(parseEuroInput('')).toBeNull();
    expect(parseEuroInput('   ')).toBeNull();
    expect(parseEuroInput(null)).toBeNull();
    expect(parseEuroInput(undefined)).toBeNull();
  });

  it('liefert null fuer Unsinn und negative Betraege', () => {
    expect(parseEuroInput('abc')).toBeNull();
    expect(parseEuroInput('-5')).toBeNull();
  });

  it('rundet auf ganze Cent', () => {
    expect(parseEuroInput('9,999')).toBe(1000);
    expect(parseEuroInput('9,994')).toBe(999);
  });
});

describe('Preisanzeige', () => {
  it('formatiert Cent als Euro-Betrag', () => {
    // Intl setzt ein schmales geschuetztes Leerzeichen vor das Zeichen.
    expect(formatEuro(1299).replace(/ | /g, ' ')).toBe('12,99 €');
  });

  it('zeigt fuer unbekannte Preise einen Gedankenstrich', () => {
    expect(formatEuro(null)).toBe('–');
    expect(formatEuro(undefined)).toBe('–');
  });

  it('macht aus Cent wieder eine Eingabe ohne Waehrungszeichen', () => {
    expect(centsToInput(1299)).toBe('12,99');
    expect(centsToInput(null)).toBe('');
  });

  it('ueberlebt den Rundweg Eingabe -> Cent -> Eingabe', () => {
    for (const input of ['0,01', '12,99', '449,99', '1.234,56']) {
      const cents = parseEuroInput(input);
      expect(cents).not.toBeNull();
      expect(parseEuroInput(centsToInput(cents))).toBe(cents);
    }
  });
});

describe('Summen', () => {
  it('addiert exakt, ohne Float-Fehler', () => {
    // 0,10 + 0,20 waere als Float 0.30000000000000004.
    expect(sumCents([10, 20])).toBe(30);
  });

  it('ignoriert unbekannte Preise', () => {
    expect(sumCents([1299, null, undefined, 100])).toBe(1399);
    expect(sumCents([])).toBe(0);
  });
});
