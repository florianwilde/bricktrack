/**
 * Value development of a set.
 *
 * Pure functions: the interesting logic is "which number counts as the current
 * value" and "what has changed since", and that should be testable without a
 * database.
 */

export type PriceObservation = {
  priceCents: number;
  condition: 'new' | 'used';
  observedAt: Date;
};

/**
 * The current value: the most recent observation. Where two land on the same
 * day, the one for a new set wins - that is the number you would pay to
 * replace it.
 */
export function currentPrice(
  observations: readonly PriceObservation[],
  retailPriceCents?: number | null,
): number | null {
  if (observations.length === 0) return retailPriceCents ?? null;

  const sorted = [...observations].sort((a, b) => {
    const byDate = b.observedAt.getTime() - a.observedAt.getTime();
    if (byDate !== 0) return byDate;
    return a.condition === 'new' ? -1 : 1;
  });

  return sorted[0]!.priceCents;
}

export type PriceTrend = {
  /** What it cost originally - the UVP, or the oldest observation. */
  baseCents: number | null;
  currentCents: number | null;
  changeCents: number | null;
  /** Rounded to one decimal, positive means it gained value. */
  changePercent: number | null;
};

export function priceTrend(
  observations: readonly PriceObservation[],
  retailPriceCents?: number | null,
): PriceTrend {
  const current = currentPrice(observations, retailPriceCents);

  const oldest = [...observations].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  )[0];
  // The recommended retail price is the honest baseline; only without one do
  // we fall back to the earliest thing we saw.
  const base = retailPriceCents ?? oldest?.priceCents ?? null;

  if (base === null || current === null || base === 0) {
    return { baseCents: base, currentCents: current, changeCents: null, changePercent: null };
  }

  const changeCents = current - base;
  return {
    baseCents: base,
    currentCents: current,
    changeCents,
    changePercent: Math.round((changeCents / base) * 1000) / 10,
  };
}

/** Sum of the current value of many sets, ignoring the ones without a price. */
export function totalValueCents(
  entries: readonly { observations: readonly PriceObservation[]; retailPriceCents?: number | null }[],
): number {
  return entries.reduce((total, entry) => {
    return total + (currentPrice(entry.observations, entry.retailPriceCents) ?? 0);
  }, 0);
}
