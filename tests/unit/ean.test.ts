import { describe, expect, it } from 'vitest';
import { formatEan, isValidEan, normalizeEan } from '@/lib/ean';

describe('EAN normalisieren', () => {
  it('behaelt nur Ziffern', () => {
    expect(normalizeEan('4 005556 603985')).toBe('4005556603985');
    expect(normalizeEan('4005556-603985')).toBe('4005556603985');
  });
});

describe('EAN pruefen', () => {
  it('akzeptiert gueltige EAN-13', () => {
    // Playmobil 70392 und ein Lego-Beispiel.
    expect(isValidEan('4008789703927')).toBe(true);
    expect(isValidEan('5702017152677')).toBe(true);
  });

  it('akzeptiert gueltige EAN-8 und UPC-A', () => {
    expect(isValidEan('96385074')).toBe(true);
    expect(isValidEan('036000291452')).toBe(true);
  });

  it('lehnt eine falsche Pruefziffer ab', () => {
    // Letzte Ziffer verdreht - genau der Fall, den eine Kamera produziert.
    expect(isValidEan('4008789703928')).toBe(false);
    expect(isValidEan('5702017152678')).toBe(false);
  });

  it('lehnt falsche Laengen ab', () => {
    expect(isValidEan('')).toBe(false);
    expect(isValidEan('123')).toBe(false);
    expect(isValidEan('40087897039271')).toBe(false);
  });

  it('ignoriert Trennzeichen bei der Pruefung', () => {
    expect(isValidEan('4 008789 703927')).toBe(true);
  });
});

describe('EAN anzeigen', () => {
  it('gruppiert eine EAN-13 lesbar', () => {
    expect(formatEan('4008789703927')).toBe('4 008789 703927');
  });

  it('laesst andere Laengen unveraendert', () => {
    expect(formatEan('96385074')).toBe('96385074');
  });
});
