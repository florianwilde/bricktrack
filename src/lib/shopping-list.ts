/**
 * Shopping list for missing parts (pure, testable).
 *
 * Every open missing part of every copy, folded into one line per part and
 * colour - "3001 red, 2x for the fire station, 1x for the police car" is one
 * line with 3 pieces. Exports as CSV and as a BrickLink wanted list.
 */

export type MissingPartEntry = {
  id: string;
  partNumber: string | null;
  colorName: string | null;
  quantity: number;
  notes: string | null;
  collectionItemId: string;
  setId: string;
  setNumber: string;
  setName: string;
};

export type ShoppingLine = {
  key: string;
  partNumber: string;
  colorName: string | null;
  quantity: number;
  /** BrickLink colour id, `null` if the name is unknown or missing. */
  bricklinkColorId: number | null;
  /** Six or seven digits are usually a LEGO element id, not a part number. */
  looksLikeElementId: boolean;
  entries: MissingPartEntry[];
};

export type ShoppingList = {
  lines: ShoppingLine[];
  /** Entries with only a note - nothing a shop could look up. */
  withoutPartNumber: MissingPartEntry[];
  totalPieces: number;
};

/**
 * BrickLink colour ids for the names people actually type, German and English.
 * Deliberately short: a wrong id would order the wrong part, while an unknown
 * name just leaves the colour open on BrickLink.
 */
const BRICKLINK_COLORS: Record<string, number> = {
  weiss: 1,
  white: 1,
  beige: 2,
  tan: 2,
  gelb: 3,
  yellow: 3,
  orange: 4,
  rot: 5,
  red: 5,
  gruen: 6,
  green: 6,
  blau: 7,
  blue: 7,
  schwarz: 11,
  black: 11,
  transparent: 12,
  klar: 12,
  transparentklar: 12,
  transclear: 12,
  transparentrot: 17,
  transred: 17,
  transparentgelb: 19,
  transyellow: 19,
  transparentblau: 15,
  translightblue: 15,
  hellgrau: 86,
  lightbluishgray: 86,
  lightbluishgrey: 86,
  dunkelgrau: 85,
  darkbluishgray: 85,
  darkbluishgrey: 85,
  braun: 88,
  reddishbrown: 88,
  dunkelrot: 59,
  darkred: 59,
  dunkelblau: 63,
  darkblue: 63,
  dunkelgruen: 80,
  darkgreen: 80,
  limette: 34,
  lime: 34,
  sandgruen: 48,
  sandgreen: 48,
  dunkelbeige: 69,
  darktan: 69,
  dunkelorange: 68,
  darkorange: 68,
  perlgold: 115,
  pearlgold: 115,
  silber: 95,
  flatsilver: 95,
};

function colorKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
}

export function bricklinkColorId(name: string | null): number | null {
  if (!name) return null;
  return BRICKLINK_COLORS[colorKey(name)] ?? null;
}

function partKey(partNumber: string): string {
  return partNumber.trim().toLowerCase();
}

export function buildShoppingList(entries: MissingPartEntry[]): ShoppingList {
  const lines = new Map<string, ShoppingLine>();
  const withoutPartNumber: MissingPartEntry[] = [];

  for (const entry of entries) {
    const partNumber = entry.partNumber?.trim();
    if (!partNumber) {
      withoutPartNumber.push(entry);
      continue;
    }
    const colorName = entry.colorName?.trim() || null;
    const key = `${partKey(partNumber)}|${colorName ? colorKey(colorName) : ''}`;
    const line = lines.get(key);
    if (line) {
      line.quantity += entry.quantity;
      line.entries.push(entry);
      // "Rot" reads better than "rot"; keep a capitalised spelling if one turns up.
      if (colorName && line.colorName && /^[a-zäöü]/.test(line.colorName) && /^[A-ZÄÖÜ]/.test(colorName)) {
        line.colorName = colorName;
      }
    } else {
      lines.set(key, {
        key,
        partNumber,
        colorName,
        quantity: entry.quantity,
        bricklinkColorId: bricklinkColorId(colorName),
        looksLikeElementId: /^\d{6,7}$/.test(partNumber),
        entries: [entry],
      });
    }
  }

  const sorted = [...lines.values()].sort(
    (a, b) =>
      a.partNumber.localeCompare(b.partNumber, 'de', { numeric: true }) ||
      (a.colorName ?? '').localeCompare(b.colorName ?? '', 'de'),
  );

  return {
    lines: sorted,
    withoutPartNumber,
    totalPieces: sorted.reduce((sum, line) => sum + line.quantity, 0),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * BrickLink wanted list, the format of "Wanted → Upload". A line without a
 * known colour goes in without COLOR, which BrickLink reads as "any colour".
 */
export function buildWantedListXml(lines: ShoppingLine[]): string {
  const items = lines.map((line) =>
    [
      '  <ITEM>',
      '    <ITEMTYPE>P</ITEMTYPE>',
      `    <ITEMID>${escapeXml(line.partNumber)}</ITEMID>`,
      line.bricklinkColorId !== null ? `    <COLOR>${line.bricklinkColorId}</COLOR>` : null,
      `    <MINQTY>${line.quantity}</MINQTY>`,
      '  </ITEM>',
    ]
      .filter((row) => row !== null)
      .join('\n'),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n${items.join('\n')}\n</INVENTORY>\n`;
}

/** Rows for the CSV download, one per line of the list. */
export function shoppingCsvRows(lines: ShoppingLine[]): Array<Record<string, string | number | null>> {
  return lines.map((line) => ({
    partNumber: line.partNumber,
    color: line.colorName,
    quantity: line.quantity,
    bricklinkColor: line.bricklinkColorId,
    sets: [...new Set(line.entries.map((entry) => `${entry.setNumber} ${entry.setName}`))].join(', '),
  }));
}

export const SHOPPING_CSV_COLUMNS = [
  { key: 'partNumber', label: 'Teilenummer' },
  { key: 'color', label: 'Farbe' },
  { key: 'quantity', label: 'Menge' },
  { key: 'bricklinkColor', label: 'BrickLink-Farbe' },
  { key: 'sets', label: 'Für Sets' },
];
