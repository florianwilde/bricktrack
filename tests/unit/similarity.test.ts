import { describe, expect, it } from 'vitest';
import { isSimilarName, levenshtein, normalizeName, similarity } from '@/lib/similarity';

describe('Namen normalisieren', () => {
  it('schreibt Umlaute aus und wirft Satzzeichen weg', () => {
    expect(normalizeName('Feuerwehr-Auto')).toBe('feuerwehr auto');
    expect(normalizeName('Grüne Kiste!')).toBe('gruene kiste');
    expect(normalizeName('Straßenbahn')).toBe('strassenbahn');
  });

  it('macht aus mehreren Leerzeichen eines', () => {
    expect(normalizeName('  Lego   City  ')).toBe('lego city');
  });
});

describe('Levenshtein', () => {
  it('ist null bei identischen Strings', () => {
    expect(levenshtein('haus', 'haus')).toBe(0);
  });

  it('zaehlt einzelne Aenderungen', () => {
    expect(levenshtein('haus', 'maus')).toBe(1);
    expect(levenshtein('haus', 'hausen')).toBe(2);
    expect(levenshtein('', 'haus')).toBe(4);
  });
});

describe('Aehnlichkeit', () => {
  it('erkennt identische Namen', () => {
    expect(similarity('Feuerwehrauto', 'feuerwehrauto')).toBe(1);
  });

  it('sinkt mit dem Unterschied', () => {
    expect(similarity('Feuerwehrauto', 'Polizeiauto')).toBeLessThan(0.7);
  });
});

describe('Dublettenverdacht', () => {
  it('schlaegt bei Tippfehlern an', () => {
    expect(isSimilarName('Familienhaus und Elektroauto', 'Familienhaus und Elektroauo')).toBe(true);
    expect(isSimilarName('Feuerwehreinsatz', 'Feuerwehr-Einsatz')).toBe(true);
  });

  it('schlaegt an, wenn ein Name im anderen steckt', () => {
    expect(isSimilarName('Feuerwehrauto', 'Feuerwehrauto mit Leiter')).toBe(true);
  });

  it('schlaegt nicht bei verschiedenen Sets desselben Themas an', () => {
    expect(isSimilarName('Feuerwehreinsatz', 'Polizeistation')).toBe(false);
    expect(isSimilarName('Kipplaster', 'McLaren P1')).toBe(false);
    // Zwei echte, unterschiedliche City-Sets.
    expect(isSimilarName('Familienhaus und Elektroauto', 'Feuerwehreinsatz')).toBe(false);
  });

  it('laesst sich von kurzen Namen nicht zu Unsinn verleiten', () => {
    // Ohne die Mindestlaenge wuerde "Bus" in "Autobus" jede Dublette melden.
    expect(isSimilarName('Bus', 'Autobus')).toBe(false);
  });
});
