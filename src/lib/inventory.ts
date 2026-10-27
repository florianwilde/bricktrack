/**
 * The running list of an inventory session (pure, testable).
 *
 * Scanning a shelf means many codes in a row. The camera reports the same
 * code several times per second while a box is in view, so a repeat within a
 * short cooldown is the same box, not a second copy. Scanning it again later,
 * deliberately, counts it again - two identical boxes are two copies.
 */

export const SCAN_COOLDOWN_MS = 2500;

export type InventoryEntry = {
  ean: string;
  count: number;
  /** `pending` until the catalog has been asked, `added` once in the collection. */
  status: 'pending' | 'known' | 'unknown' | 'added';
  setId?: string;
  setNumber?: string;
  name?: string;
  /** Copies already in the collection before this session added any. */
  ownedCopies?: number;
  scannedAt: number;
};

export type LastScan = { ean: string; at: number } | null;

export type ScanOutcome = {
  entries: InventoryEntry[];
  last: LastScan;
  /** `false` if the scan was a camera repeat and changed nothing. */
  counted: boolean;
};

/** The same code again within the cooldown - the camera still sees the same box. */
export function isCameraRepeat(last: LastScan, ean: string, now: number): boolean {
  return last !== null && last.ean === ean && now - last.at < SCAN_COOLDOWN_MS;
}

/** Newest first: the box just scanned is the one people look for. */
export function registerScan(
  entries: InventoryEntry[],
  ean: string,
  now: number,
  last: LastScan,
): ScanOutcome {
  if (isCameraRepeat(last, ean, now)) {
    return { entries, last: { ean, at: now }, counted: false };
  }

  const existing = entries.find((entry) => entry.ean === ean);
  if (existing) {
    const updated: InventoryEntry = {
      ...existing,
      count: existing.count + 1,
      // A set that was already taken over and turns up again is a new copy.
      status: existing.status === 'added' ? 'known' : existing.status,
      scannedAt: now,
    };
    return {
      entries: [updated, ...entries.filter((entry) => entry.ean !== ean)],
      last: { ean, at: now },
      counted: true,
    };
  }

  return {
    entries: [{ ean, count: 1, status: 'pending', scannedAt: now }, ...entries],
    last: { ean, at: now },
    counted: true,
  };
}

export type InventoryLookup =
  | { ean: string; found: true; setId: string; setNumber: string; name: string; ownedCopies: number }
  | { ean: string; found: false };

export function applyLookups(entries: InventoryEntry[], results: InventoryLookup[]): InventoryEntry[] {
  const byEan = new Map(results.map((result) => [result.ean, result]));
  return entries.map((entry) => {
    const result = byEan.get(entry.ean);
    if (!result || entry.status !== 'pending') return entry;
    return result.found
      ? {
          ...entry,
          status: 'known',
          setId: result.setId,
          setNumber: result.setNumber,
          name: result.name,
          ownedCopies: result.ownedCopies,
        }
      : { ...entry, status: 'unknown' };
  });
}

export function setCount(entries: InventoryEntry[], ean: string, count: number): InventoryEntry[] {
  if (count < 1) return entries.filter((entry) => entry.ean !== ean);
  return entries.map((entry) => (entry.ean === ean ? { ...entry, count: Math.min(count, 99) } : entry));
}

export function markAdded(entries: InventoryEntry[], eans: string[]): InventoryEntry[] {
  const done = new Set(eans);
  return entries.map((entry) =>
    done.has(entry.ean)
      ? { ...entry, status: 'added', ownedCopies: (entry.ownedCopies ?? 0) + entry.count, count: 0 }
      : entry,
  );
}

/** Entries that could go into the collection right now. */
export function readyToAdd(entries: InventoryEntry[]): InventoryEntry[] {
  return entries.filter((entry) => entry.status === 'known' && entry.count > 0 && entry.setId);
}

/** Entries that were looked up but not found - they need a catalog entry first. */
export function unknownEntries(entries: InventoryEntry[]): InventoryEntry[] {
  return entries.filter((entry) => entry.status === 'unknown');
}

/** Codes still waiting for the catalog, e.g. after a reload or a new set was created. */
export function pendingEans(entries: InventoryEntry[]): string[] {
  return entries.filter((entry) => entry.status === 'pending').map((entry) => entry.ean);
}

/**
 * The list survives a reload in the browser's storage. Anything that does not
 * look like a list of entries is dropped instead of breaking the page.
 */
export function parseStoredInventory(raw: string | null): InventoryEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is InventoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as InventoryEntry).ean === 'string' &&
        typeof (entry as InventoryEntry).count === 'number' &&
        ['pending', 'known', 'unknown', 'added'].includes((entry as InventoryEntry).status),
    );
  } catch {
    return [];
  }
}
