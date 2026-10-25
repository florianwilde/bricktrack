import { describe, expect, it } from 'vitest';
import { brickRow } from '@/lib/brick-row';
import { DEFAULT_DESIGN, DESIGNS, DESIGN_INFO, resolveDesign, TONE_COUNT, toneIndex } from '@/lib/design';

describe('Design aus dem Cookie', () => {
  it('nimmt ein bekanntes Design', () => {
    expect(resolveDesign('nacht')).toBe('nacht');
    expect(resolveDesign('schlicht')).toBe('schlicht');
  });

  it('faellt bei Unbekanntem auf Klemmbaustein zurueck', () => {
    expect(DEFAULT_DESIGN).toBe('klemmbaustein');
    expect(resolveDesign(undefined)).toBe('klemmbaustein');
    expect(resolveDesign('')).toBe('klemmbaustein');
    expect(resolveDesign('"><script>')).toBe('klemmbaustein');
  });

  it('beschreibt jedes Design', () => {
    for (const design of DESIGNS) {
      expect(DESIGN_INFO[design].label.length).toBeGreaterThan(0);
      expect(DESIGN_INFO[design].themeColor).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(DESIGNS.filter((design) => DESIGN_INFO[design].dark)).toEqual(['nacht']);
  });
});

describe('Farbton fuer Sets ohne Bild', () => {
  it('gibt den bekannten Herstellern feste, verschiedene Toene', () => {
    const tones = ['Lego', 'Playmobil', 'Cobi', 'BlueBrixx', 'Mega Bloks'].map(toneIndex);
    expect(new Set(tones).size).toBe(5);
    expect(toneIndex('Lego')).toBe(1);
    expect(toneIndex('LEGO')).toBe(1);
  });

  it('bleibt fuer andere Hersteller stabil und im Bereich', () => {
    expect(toneIndex('Sluban')).toBe(toneIndex('Sluban'));
    for (const name of ['Sluban', 'Qman', 'Wange', '', 'Ölfabrik']) {
      const tone = toneIndex(name);
      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(TONE_COUNT);
    }
  });
});

describe('Steinreihe auf der Startseite', () => {
  it('ist leer ohne Katalog oder ohne Sammlung', () => {
    expect(brickRow(0, 10, [])).toEqual(Array(10).fill(null));
    expect(brickRow(3, 0, [])).toEqual(Array(10).fill(null));
  });

  it('verteilt die Steine nach Anteil auf die Sammler', () => {
    const row = brickRow(4, 10, [
      { key: 'max', count: 2 },
      { key: 'mia', count: 2 },
    ]);
    expect(row).toEqual(['max', 'max', 'mia', 'mia', null, null, null, null, null, null]);
  });

  it('zeigt mindestens einen Stein, aber nie eine volle Reihe vor dem Ziel', () => {
    expect(brickRow(1, 500, [{ key: 'max', count: 1 }]).filter(Boolean)).toHaveLength(1);
    expect(brickRow(499, 500, [{ key: 'max', count: 499 }]).filter(Boolean)).toHaveLength(9);
    expect(brickRow(500, 500, [{ key: 'max', count: 500 }]).filter(Boolean)).toHaveLength(10);
  });

  it('vergibt Reststeine nach dem groessten Bruchteil', () => {
    const row = brickRow(10, 20, [
      { key: 'a', count: 1 },
      { key: 'b', count: 1 },
      { key: 'c', count: 1 },
    ]);
    // 5 Steine auf drei gleiche Anteile: 2, 2, 1 - die vorderen zuerst.
    expect(row.filter((key) => key === 'a')).toHaveLength(2);
    expect(row.filter((key) => key === 'b')).toHaveLength(2);
    expect(row.filter((key) => key === 'c')).toHaveLength(1);
  });

  it('fuellt ohne Sammler-Zuordnung neutral', () => {
    expect(brickRow(5, 10, []).slice(0, 5)).toEqual(['', '', '', '', '']);
  });
});
