import { describe, expect, it } from 'vitest';
import {
  fragmentsToHighlight,
  nextHitPage,
  normalizeForSearch,
  searchPages,
} from '@/lib/pdf-search';

describe('Suche in Anleitungen', () => {
  it('ignoriert Groß- und Kleinschreibung, Umlaute und Leerzeichen', () => {
    expect(normalizeForSearch('Räder  Groß')).toBe('radergross');
    expect(normalizeForSearch('6 0 3 9 8')).toBe('60398');
  });

  it('findet Seiten in Reihenfolge und zählt Treffer', () => {
    const pages = ['Titel 60398', 'Schritt 1', '', '3001 2x Rot · 3001 4x Blau'];
    expect(searchPages(pages, '3001')).toEqual([
      { page: 4, count: 2, snippet: '3001 2x Rot · 3001 4x Blau' },
    ]);
    expect(searchPages(pages, '603 98').map((hit) => hit.page)).toEqual([1]);
  });

  it('liefert nichts für eine leere Suche oder Seiten ohne Text', () => {
    expect(searchPages(['abc'], '   ')).toEqual([]);
    expect(searchPages(['', ''], 'abc')).toEqual([]);
  });

  it('kürzt den Ausschnitt um den Treffer', () => {
    const text = `${'a'.repeat(80)} Bauteil 6211340 ${'b'.repeat(80)}`;
    const [hit] = searchPages([text], '6211340');
    expect(hit?.snippet.startsWith('…')).toBe(true);
    expect(hit?.snippet.endsWith('…')).toBe(true);
    expect(hit?.snippet).toContain('Bauteil 6211340');
  });

  it('markiert alle Fragmente, über die sich ein Treffer verteilt', () => {
    expect(fragmentsToHighlight(['Set ', '603', '98', ' Haus'], '60398')).toEqual([1, 2]);
    expect(fragmentsToHighlight(['2x', '3001', '4x', '3001'], '3001')).toEqual([1, 3]);
    expect(fragmentsToHighlight(['abc'], '')).toEqual([]);
  });

  it('springt zum nächsten oder vorigen Treffer und läuft im Kreis', () => {
    const hits = [3, 7, 12].map((page) => ({ page, count: 1, snippet: '' }));
    expect(nextHitPage(hits, 1, 1)).toBe(3);
    expect(nextHitPage(hits, 7, 1)).toBe(12);
    expect(nextHitPage(hits, 12, 1)).toBe(3);
    expect(nextHitPage(hits, 7, -1)).toBe(3);
    expect(nextHitPage(hits, 3, -1)).toBe(12);
    expect(nextHitPage([], 3, 1)).toBeNull();
  });
});
