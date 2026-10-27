import { describe, expect, it } from 'vitest';
import { buildTimeline, TIMELINE_MONTHS, timelineRows, type TimelineItem } from '@/lib/timeline';

let counter = 0;
function item(acquiredAt: string | null, extra: Partial<TimelineItem> = {}): TimelineItem {
  counter += 1;
  return {
    id: `c-${counter}`,
    setId: `s-${counter}`,
    setNumber: String(60000 + counter),
    setName: `Set ${counter}`,
    acquiredAt: acquiredAt ? new Date(`${acquiredAt}T12:00:00`) : null,
    pieceCount: 100,
    acquiredPriceCents: null,
    giftedBy: null,
    ...extra,
  };
}

const NOW = new Date('2026-10-27T12:00:00');

describe('Verlauf der Sammlung', () => {
  it('fasst nach Jahren zusammen, mit leeren Jahren dazwischen', () => {
    const timeline = buildTimeline(
      [
        item('2023-12-24', { acquiredPriceCents: 4999, pieceCount: 462 }),
        item('2023-05-01', { giftedBy: 'Oma' }),
        item('2025-03-10'),
      ],
      'year',
      NOW,
    );

    expect(timeline.buckets.map((bucket) => [bucket.key, bucket.count, bucket.cumulative])).toEqual([
      ['2023', 2, 2],
      ['2024', 0, 2],
      ['2025', 1, 3],
      ['2026', 0, 3],
    ]);
    const [first] = timeline.buckets;
    expect(first?.pieces).toBe(562);
    expect(first?.spentCents).toBe(4999);
    expect(first?.gifts).toBe(1);
    // Oldest first inside a bucket.
    expect(first?.items.map((entry) => entry.acquiredAt?.getMonth())).toEqual([4, 11]);
    expect(timeline.maxCount).toBe(2);
  });

  it('zählt Exemplare ohne Datum getrennt, statt sie zu raten', () => {
    const timeline = buildTimeline([item(null), item('2026-01-15'), item(null)], 'year', NOW);
    expect(timeline.undated).toHaveLength(2);
    expect(timeline.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });

  it('liefert ohne datierte Exemplare keine Balken', () => {
    const timeline = buildTimeline([item(null)], 'month', NOW);
    expect(timeline.buckets).toEqual([]);
    expect(timeline.maxCount).toBe(1);
  });

  it('zeigt in der Monatsansicht die letzten 24 Monate und rechnet Älteres in die Summe ein', () => {
    const timeline = buildTimeline(
      [item('2019-06-01'), item('2025-02-14'), item('2026-10-03')],
      'month',
      NOW,
    );

    expect(timeline.buckets).toHaveLength(TIMELINE_MONTHS);
    expect(timeline.buckets[0]?.key).toBe('2024-11');
    expect(timeline.buckets[0]?.cumulative).toBe(1);
    expect(timeline.buckets.at(-1)?.key).toBe('2026-10');
    expect(timeline.buckets.at(-1)?.label).toBe('Oktober 2026');
    expect(timeline.buckets.at(-1)?.cumulative).toBe(3);
    expect(timeline.buckets.find((bucket) => bucket.key === '2025-02')?.count).toBe(1);
  });

  it('beginnt bei einer jungen Sammlung mit dem ersten Monat statt mit leeren', () => {
    const timeline = buildTimeline([item('2026-08-20'), item('2026-10-01')], 'month', NOW);
    expect(timeline.buckets.map((bucket) => bucket.key)).toEqual(['2026-08', '2026-09', '2026-10']);
  });
});

describe('Anzeige des Verlaufs', () => {
  it('fasst leere Zeiträume zu einer Zeile zusammen, neueste zuerst', () => {
    const timeline = buildTimeline(
      [item('2026-06-10'), item('2026-10-02')],
      'month',
      NOW,
    );
    const rows = timelineRows(timeline.buckets);
    expect(rows.map((row) => (row.kind === 'bucket' ? row.bucket.key : `${row.from}–${row.to}`))).toEqual([
      '2026-10',
      'Juli 2026–September 2026',
      '2026-06',
    ]);
    const gap = rows[1];
    expect(gap?.kind === 'gap' ? gap.cumulative : null).toBe(1);
  });

  it('zeigt einen einzelnen leeren Zeitraum mit gleichem Anfang und Ende', () => {
    const rows = timelineRows(buildTimeline([item('2024-01-01'), item('2026-01-01')], 'year', NOW).buckets);
    expect(rows.map((row) => row.kind)).toEqual(['bucket', 'gap', 'bucket']);
    expect(rows.find((row) => row.kind === 'gap')).toMatchObject({ from: '2025', to: '2025' });
  });
});
