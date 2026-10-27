/**
 * "Was kam wann dazu" - the collection grouped by the date each copy arrived
 * (pure, testable).
 *
 * The date is `acquired_at`, the day it actually came into the house. The day
 * it was typed into the app says nothing - a whole shelf gets entered on one
 * evening - so copies without an acquisition date are counted separately
 * instead of being guessed into a bucket.
 */

export type TimelineUnit = 'year' | 'month';

export type TimelineItem = {
  id: string;
  setId: string;
  setNumber: string;
  setName: string;
  acquiredAt: Date | null;
  pieceCount: number | null;
  acquiredPriceCents: number | null;
  giftedBy: string | null;
};

export type TimelineBucket = {
  /** `2025` or `2025-03`, stable for keys and links. */
  key: string;
  /** `2025` or `März 2025`. */
  label: string;
  count: number;
  pieces: number;
  spentCents: number;
  gifts: number;
  /** Running total of copies up to and including this bucket. */
  cumulative: number;
  /** Oldest first within the bucket. */
  items: TimelineItem[];
};

export type Timeline = {
  unit: TimelineUnit;
  buckets: TimelineBucket[];
  /** Copies without an acquisition date. */
  undated: TimelineItem[];
  /** Largest bucket count, for scaling a chart; at least 1. */
  maxCount: number;
};

const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** How many months the month view goes back, the current one included. */
export const TIMELINE_MONTHS = 24;

function keyOf(date: Date, unit: TimelineUnit): string {
  const year = date.getFullYear();
  if (unit === 'year') return String(year);
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function labelOf(key: string, unit: TimelineUnit): string {
  if (unit === 'year') return key;
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** Every bucket key from `first` to `last`, gaps included - an empty year is information too. */
function keysBetween(first: Date, last: Date, unit: TimelineUnit): string[] {
  const keys: string[] = [];
  if (unit === 'year') {
    for (let year = first.getFullYear(); year <= last.getFullYear(); year += 1) keys.push(String(year));
    return keys;
  }
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);
  while (cursor <= end) {
    keys.push(keyOf(cursor, 'month'));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

export function buildTimeline(
  items: TimelineItem[],
  unit: TimelineUnit,
  now: Date = new Date(),
): Timeline {
  const dated = items
    .filter((item): item is TimelineItem & { acquiredAt: Date } => item.acquiredAt !== null)
    .sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime());
  const undated = items.filter((item) => item.acquiredAt === null);

  const first = dated[0]?.acquiredAt;
  if (!first) return { unit, buckets: [], undated, maxCount: 1 };

  const lastDated = dated[dated.length - 1]?.acquiredAt ?? first;
  const last = lastDated > now ? lastDated : now;

  // The month view is about the recent past; older copies still count in
  // the running total, so the first visible bucket starts from them.
  const start =
    unit === 'month'
      ? new Date(last.getFullYear(), last.getMonth() - (TIMELINE_MONTHS - 1), 1)
      : first;
  const visibleFrom = start > first ? start : first;

  const byKey = new Map<string, TimelineItem[]>();
  let before = 0;
  for (const item of dated) {
    if (item.acquiredAt < visibleFrom) {
      before += 1;
      continue;
    }
    const key = keyOf(item.acquiredAt, unit);
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
  }

  let cumulative = before;
  const buckets = keysBetween(visibleFrom, last, unit).map((key) => {
    const bucketItems = byKey.get(key) ?? [];
    cumulative += bucketItems.length;
    return {
      key,
      label: labelOf(key, unit),
      count: bucketItems.length,
      pieces: bucketItems.reduce((sum, item) => sum + (item.pieceCount ?? 0), 0),
      spentCents: bucketItems.reduce((sum, item) => sum + (item.acquiredPriceCents ?? 0), 0),
      gifts: bucketItems.filter((item) => item.giftedBy).length,
      cumulative,
      items: bucketItems,
    };
  });

  return {
    unit,
    buckets,
    undated,
    maxCount: Math.max(1, ...buckets.map((bucket) => bucket.count)),
  };
}

export type TimelineRow =
  | { kind: 'bucket'; bucket: TimelineBucket }
  | { kind: 'gap'; key: string; from: string; to: string; cumulative: number };

/**
 * Buckets for display, newest first, with runs of empty buckets folded into
 * one "nothing came" row - two years of quiet months are one line, not 24.
 */
export function timelineRows(buckets: TimelineBucket[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let gap: TimelineBucket[] = [];

  const flush = () => {
    const newest = gap[0];
    const oldest = gap[gap.length - 1];
    if (newest && oldest) {
      rows.push({
        kind: 'gap',
        key: `gap-${oldest.key}`,
        from: oldest.label,
        to: newest.label,
        cumulative: newest.cumulative,
      });
    }
    gap = [];
  };

  for (const bucket of [...buckets].reverse()) {
    if (bucket.count === 0) {
      gap.push(bucket);
      continue;
    }
    flush();
    rows.push({ kind: 'bucket', bucket });
  }
  flush();
  return rows;
}
