import { describe, expect, it } from 'vitest';
import {
  bricklinkColorId,
  buildShoppingList,
  buildWantedListXml,
  shoppingCsvRows,
  type MissingPartEntry,
} from '@/lib/shopping-list';

let counter = 0;
function entry(partNumber: string | null, colorName: string | null, quantity = 1, setNumber = '60398'): MissingPartEntry {
  counter += 1;
  return {
    id: `p-${counter}`,
    partNumber,
    colorName,
    quantity,
    notes: partNumber ? null : 'Aufkleber Seite 3',
    collectionItemId: `c-${setNumber}`,
    setId: `s-${setNumber}`,
    setNumber,
    setName: `Set ${setNumber}`,
  };
}

describe('Fehlteile-Einkaufsliste', () => {
  it('fasst gleiche Teile in gleicher Farbe über Sets hinweg zusammen', () => {
    const list = buildShoppingList([
      entry('3001', 'Rot', 2, '60398'),
      entry(' 3001 ', 'rot', 1, '60414'),
      entry('3001', 'Blau', 4),
      entry('3003', null, 1),
    ]);

    expect(list.lines.map((line) => [line.partNumber, line.colorName, line.quantity])).toEqual([
      ['3001', 'Blau', 4],
      ['3001', 'Rot', 3],
      ['3003', null, 1],
    ]);
    expect(list.lines[1]?.entries).toHaveLength(2);
    expect(buildShoppingList([entry('3001', 'rot'), entry('3001', 'Rot')]).lines[0]?.colorName).toBe('Rot');
    expect(list.totalPieces).toBe(8);
  });

  it('legt Einträge ohne Teilenummer getrennt ab', () => {
    const list = buildShoppingList([entry(null, null), entry('3001', 'Rot')]);
    expect(list.withoutPartNumber).toHaveLength(1);
    expect(list.lines).toHaveLength(1);
  });

  it('sortiert Teilenummern numerisch', () => {
    const list = buildShoppingList([entry('3010', null), entry('300', null), entry('3001', null)]);
    expect(list.lines.map((line) => line.partNumber)).toEqual(['300', '3001', '3010']);
  });

  it('kennt gängige Farbnamen auf Deutsch und Englisch, sonst keine', () => {
    expect(bricklinkColorId('Rot')).toBe(5);
    expect(bricklinkColorId('Grün')).toBe(6);
    expect(bricklinkColorId('Weiß')).toBe(1);
    expect(bricklinkColorId('Light Bluish Gray')).toBe(86);
    expect(bricklinkColorId('Hellgrau')).toBe(86);
    expect(bricklinkColorId('Trans-Clear')).toBe(12);
    expect(bricklinkColorId('Mittelazur')).toBeNull();
    expect(bricklinkColorId(null)).toBeNull();
  });

  it('erkennt Element-Nummern, die BrickLink nicht versteht', () => {
    const list = buildShoppingList([entry('300121', null), entry('3001', null), entry('3626cpr0001', null)]);
    expect(list.lines.map((line) => [line.partNumber, line.looksLikeElementId])).toEqual([
      ['3001', false],
      ['3626cpr0001', false],
      ['300121', true],
    ]);
  });

  it('schreibt eine BrickLink-Wunschliste, ohne Farbe wenn unbekannt', () => {
    const list = buildShoppingList([entry('3001', 'Rot', 3), entry('3003', 'Mittelazur', 2), entry('A&B', null)]);
    const xml = buildWantedListXml(list.lines);
    expect(xml).toContain('<ITEMID>3001</ITEMID>\n    <COLOR>5</COLOR>\n    <MINQTY>3</MINQTY>');
    expect(xml).toContain('<ITEMID>3003</ITEMID>\n    <MINQTY>2</MINQTY>');
    expect(xml).toContain('<ITEMID>A&amp;B</ITEMID>');
    expect(xml.startsWith('<?xml')).toBe(true);
  });

  it('nennt im CSV jedes Set nur einmal', () => {
    const list = buildShoppingList([entry('3001', 'Rot', 1, '60398'), entry('3001', 'Rot', 1, '60398')]);
    expect(shoppingCsvRows(list.lines)).toEqual([
      { partNumber: '3001', color: 'Rot', quantity: 2, bricklinkColor: 5, sets: '60398 Set 60398' },
    ]);
  });
});
