import { describe, expect, it } from 'vitest';
import { currentPrice, priceTrend, totalValueCents } from '@/lib/prices';

const on = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('Aktueller Wert', () => {
  it('faellt ohne Beobachtung auf die UVP zurueck', () => {
    expect(currentPrice([], 4999)).toBe(4999);
  });

  it('ist null, wenn es weder Beobachtung noch UVP gibt', () => {
    expect(currentPrice([], null)).toBeNull();
    expect(currentPrice([])).toBeNull();
  });

  it('nimmt die neueste Beobachtung, nicht die hoechste', () => {
    const value = currentPrice(
      [
        { priceCents: 9900, condition: 'new', observedAt: on('2026-01-01') },
        { priceCents: 6900, condition: 'new', observedAt: on('2026-06-01') },
      ],
      4999,
    );

    expect(value).toBe(6900);
  });

  it('bevorzugt am selben Tag den Neupreis', () => {
    const value = currentPrice([
      { priceCents: 4000, condition: 'used', observedAt: on('2026-06-01') },
      { priceCents: 8000, condition: 'new', observedAt: on('2026-06-01') },
    ]);

    expect(value).toBe(8000);
  });

  it('schlaegt die UVP, sobald es eine Beobachtung gibt', () => {
    const value = currentPrice(
      [{ priceCents: 12000, condition: 'new', observedAt: on('2026-06-01') }],
      4999,
    );

    expect(value).toBe(12000);
  });
});

describe('Wertentwicklung', () => {
  it('misst gegen die UVP', () => {
    const trend = priceTrend(
      [{ priceCents: 9998, condition: 'new', observedAt: on('2026-06-01') }],
      4999,
    );

    expect(trend.baseCents).toBe(4999);
    expect(trend.currentCents).toBe(9998);
    expect(trend.changeCents).toBe(4999);
    expect(trend.changePercent).toBe(100);
  });

  it('zeigt auch Verluste', () => {
    const trend = priceTrend(
      [{ priceCents: 2500, condition: 'used', observedAt: on('2026-06-01') }],
      5000,
    );

    expect(trend.changeCents).toBe(-2500);
    expect(trend.changePercent).toBe(-50);
  });

  it('nimmt ohne UVP die aelteste Beobachtung als Basis', () => {
    const trend = priceTrend([
      { priceCents: 1000, condition: 'new', observedAt: on('2026-01-01') },
      { priceCents: 1500, condition: 'new', observedAt: on('2026-06-01') },
    ]);

    expect(trend.baseCents).toBe(1000);
    expect(trend.changePercent).toBe(50);
  });

  it('rechnet nicht, wenn es nichts zu vergleichen gibt', () => {
    const trend = priceTrend([], null);

    expect(trend.changeCents).toBeNull();
    expect(trend.changePercent).toBeNull();
  });

  it('teilt nicht durch null', () => {
    const trend = priceTrend(
      [{ priceCents: 1000, condition: 'new', observedAt: on('2026-06-01') }],
      0,
    );

    expect(trend.changePercent).toBeNull();
  });

  it('rundet den Prozentwert auf eine Nachkommastelle', () => {
    const trend = priceTrend(
      [{ priceCents: 3333, condition: 'new', observedAt: on('2026-06-01') }],
      10000,
    );

    expect(trend.changePercent).toBe(-66.7);
  });
});

describe('Gesamtwert', () => {
  it('summiert die aktuellen Werte', () => {
    const total = totalValueCents([
      {
        observations: [{ priceCents: 6900, condition: 'new', observedAt: on('2026-06-01') }],
        retailPriceCents: 4999,
      },
      { observations: [], retailPriceCents: 2999 },
    ]);

    expect(total).toBe(9899);
  });

  it('ignoriert Sets ohne jeden Preis', () => {
    const total = totalValueCents([
      { observations: [], retailPriceCents: null },
      { observations: [], retailPriceCents: 1000 },
    ]);

    expect(total).toBe(1000);
  });
});
