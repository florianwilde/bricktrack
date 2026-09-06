import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/slug';

describe('Slugs', () => {
  it('schreibt deutsche Umlaute aus', () => {
    expect(slugify('Grüne Kiste')).toBe('gruene-kiste');
    expect(slugify('Öl')).toBe('oel');
    expect(slugify('Straße')).toBe('strasse');
  });

  it('entfernt uebrige Akzente', () => {
    expect(slugify('Café Déjà vu')).toBe('cafe-deja-vu');
  });

  it('macht aus Sonderzeichen einzelne Trennstriche', () => {
    expect(slugify('Lego  City   ---  Feuerwehr!')).toBe('lego-city-feuerwehr');
  });

  it('laesst keine Trennstriche am Rand stehen', () => {
    expect(slugify('  -Playmobil-  ')).toBe('playmobil');
  });

  it('kuerzt sehr lange Namen', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(60);
  });
});

describe('Eindeutige Slugs', () => {
  it('nimmt den Slug direkt, wenn er frei ist', () => {
    expect(uniqueSlug('Lego', [])).toBe('lego');
  });

  it('haengt einen Zaehler an, bis der Slug frei ist', () => {
    expect(uniqueSlug('Lego', ['lego'])).toBe('lego-2');
    expect(uniqueSlug('Lego', ['lego', 'lego-2'])).toBe('lego-3');
  });

  it('faellt bei Namen ohne verwertbare Zeichen auf "eintrag" zurueck', () => {
    expect(uniqueSlug('###', [])).toBe('eintrag');
    expect(uniqueSlug('###', ['eintrag'])).toBe('eintrag-2');
  });
});
