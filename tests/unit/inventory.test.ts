import { describe, expect, it } from 'vitest';
import {
  applyLookups,
  markAdded,
  parseStoredInventory,
  pendingEans,
  readyToAdd,
  registerScan,
  SCAN_COOLDOWN_MS,
  setCount,
  unknownEntries,
  type InventoryEntry,
} from '@/lib/inventory';

const A = '5702017117690';
const B = '4008789709564';

function scanAll(codes: Array<[string, number]>) {
  let entries: InventoryEntry[] = [];
  let last = null as ReturnType<typeof registerScan>['last'];
  for (const [ean, at] of codes) ({ entries, last } = registerScan(entries, ean, at, last));
  return entries;
}

describe('Inventur', () => {
  it('zählt Kamera-Wiederholungen nicht doppelt', () => {
    const entries = scanAll([
      [A, 0],
      [A, 300],
      [A, 900],
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.count).toBe(1);
  });

  it('zählt einen bewusst zweiten Scan als zweites Exemplar', () => {
    const entries = scanAll([
      [A, 0],
      [B, 1000],
      [A, 2000],
    ]);
    expect(entries.map((entry) => [entry.ean, entry.count])).toEqual([
      [A, 2],
      [B, 1],
    ]);
    expect(scanAll([[A, 0], [A, SCAN_COOLDOWN_MS + 1]])[0]?.count).toBe(2);
  });

  it('übernimmt die Antwort des Katalogs', () => {
    const scanned = scanAll([
      [A, 0],
      [B, 5000],
    ]);
    const entries = applyLookups(scanned, [
      { ean: A, found: true, setId: 's-1', setNumber: '60398', name: 'Familienhaus', ownedCopies: 1 },
      { ean: B, found: false },
    ]);
    expect(readyToAdd(entries).map((entry) => entry.setNumber)).toEqual(['60398']);
    expect(unknownEntries(entries).map((entry) => entry.ean)).toEqual([B]);
    expect(pendingEans(entries)).toEqual([]);
  });

  it('merkt sich Übernommenes und zählt einen späteren Scan neu', () => {
    let entries = applyLookups(scanAll([[A, 0]]), [
      { ean: A, found: true, setId: 's-1', setNumber: '60398', name: 'Familienhaus', ownedCopies: 0 },
    ]);
    entries = markAdded(entries, [A]);
    expect(entries[0]).toMatchObject({ status: 'added', count: 0, ownedCopies: 1 });
    expect(readyToAdd(entries)).toEqual([]);

    entries = registerScan(entries, A, 60_000, null).entries;
    expect(entries[0]).toMatchObject({ status: 'known', count: 1 });
  });

  it('ändert die Anzahl und entfernt bei null', () => {
    const entries = scanAll([[A, 0]]);
    expect(setCount(entries, A, 3)[0]?.count).toBe(3);
    expect(setCount(entries, A, 0)).toEqual([]);
  });

  it('liest eine gespeicherte Liste und verwirft Unsinn', () => {
    const entries = scanAll([[A, 0]]);
    expect(parseStoredInventory(JSON.stringify(entries))).toEqual(entries);
    expect(parseStoredInventory('kaputt')).toEqual([]);
    expect(parseStoredInventory('{"ean":1}')).toEqual([]);
    expect(parseStoredInventory(JSON.stringify([{ ean: A, count: 1, status: 'egal' }]))).toEqual([]);
    expect(parseStoredInventory(null)).toEqual([]);
  });
});
