import { isValidEan, normalizeEan } from './ean';

/**
 * Reads set data out of a pasted link and, where the page can be fetched, out
 * of its structured data (schema.org JSON-LD, Open Graph).
 *
 * Pure: no network, no database. The server action in katalog/link-actions.ts
 * does the fetching and decides what to trust.
 */

export type LinkHints = {
  manufacturer?: string;
  setNumber?: string;
  name?: string;
  ean?: string;
  imageUrl?: string;
  pieceCount?: number;
  year?: number;
};

/** Brands we recognise in links and page data, with how we spell them. */
const BRANDS: Array<{ name: string; aliases: string[] }> = [
  { name: 'Lego', aliases: ['lego'] },
  { name: 'Playmobil', aliases: ['playmobil'] },
  { name: 'Cobi', aliases: ['cobi'] },
  { name: 'BlueBrixx', aliases: ['bluebrixx', 'bluebrixxpro', 'bb'] },
  { name: 'Mega Bloks', aliases: ['megabloks', 'megaconstrux', 'mega'] },
  { name: 'Mould King', aliases: ['mouldking'] },
  { name: 'Cada', aliases: ['cada'] },
  { name: 'Sluban', aliases: ['sluban'] },
  { name: 'Qman', aliases: ['qman', 'keeppley'] },
  { name: 'Xingbao', aliases: ['xingbao'] },
];

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** "LEGO®", "lego", "BlueBrixx Pro" -> "Lego", "BlueBrixx". */
export function canonicalBrand(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const wanted = key(value);
  if (!wanted) return undefined;
  for (const brand of BRANDS) {
    if (brand.aliases.some((alias) => wanted === alias || (alias.length > 3 && wanted.startsWith(alias)))) {
      return brand.name;
    }
  }
  return undefined;
}

/** Where a link points, in words for the UI. */
export function sourceLabel(url: URL): string {
  const host = url.hostname.replace(/^www\./, '');
  if (/(^|\.)amazon\./.test(host) || /^amzn\./.test(host)) return 'Amazon';
  if (/(^|\.)idealo\./.test(host)) return 'idealo';
  if (/(^|\.)geizhals\./.test(host)) return 'geizhals';
  if (/(^|\.)brickmerge\./.test(host)) return 'brickmerge';
  if (/(^|\.)brickfact\./.test(host)) return 'Brickfact';
  if (/(^|\.)merlinsbricks\./.test(host)) return 'Merlins Bricks';
  if (/(^|\.)ebay\./.test(host)) return 'eBay';
  return host;
}

// Words that sit in shop slugs but never in a set name.
const STOPWORDS = new Set([
  'set', 'sets', 'bausatz', 'bausteine', 'klemmbausteine', 'baustein', 'spielzeug', 'spielset',
  'kinder', 'jungen', 'maedchen', 'mädchen', 'ab', 'jahre', 'jahren', 'jahr', 'teile', 'teilig',
  'geschenk', 'geschenkidee', 'the', 'and', 'for', 'kids', 'boys',
  'girls', 'toy', 'toys', 'building', 'kit', 'bricks', 'brick', 'preisvergleich', 'dp', 'html',
  'neu', 'ovp', 'new', 'sealed',
]);

const KEEP_LOWER = new Set(['und', 'mit', 'der', 'die', 'das', 'von', 'im', 'am', 'zum', 'zur']);

function looksLikeYear(value: string): boolean {
  const year = Number(value);
  return year >= 1950 && year <= 2040;
}

/**
 * A set number in a list of slug tokens: 4 to 7 digits, longer ones first,
 * and four-digit years only as a last resort. Cobi's "2-30500" style is kept.
 */
function findSetNumber(tokens: string[]): string | undefined {
  const joined = tokens.join('-');
  const cobi = /(?:^|-)(\d-\d{5})(?:-|$)/.exec(joined);
  if (cobi) return cobi[1];

  const numbers = tokens.filter((token) => /^\d{4,7}$/.test(token));
  const best =
    numbers.find((token) => token.length >= 5) ?? numbers.find((token) => !looksLikeYear(token));
  return best;
}

function titleCase(word: string): string {
  if (KEEP_LOWER.has(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** The descriptive part of a shop URL, split into words. */
function slugTokens(url: URL): string[] {
  const segments = decodeURIComponent(url.pathname)
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/\.html?$/i, ''));

  let slug = '';
  const host = url.hostname;

  if (/amazon\./.test(host)) {
    // amazon.de/LEGO-60398-Familienhaus-Elektroauto/dp/B0...: the part before /dp/.
    const dp = segments.findIndex((segment) => segment === 'dp' || segment === 'gp');
    slug = dp > 0 ? segments[dp - 1]! : '';
  } else if (/idealo\./.test(host)) {
    // .../OffersOfProduct/202595377_-familienhaus-mit-elektroauto-60398-lego
    slug = (segments.at(-1) ?? '').replace(/^\d+_-?/, '');
  } else if (/geizhals\./.test(host)) {
    // geizhals.de/lego-city-familienhaus-...-60398-a2875000
    slug = (segments.at(-1) ?? '').replace(/-a\d+$/, '');
  } else {
    // Generic: the longest segment with dashes is usually the product slug.
    slug = [...segments].sort((a, b) => b.split(/[-_]/).length - a.split(/[-_]/).length)[0] ?? '';
  }

  return slug
    .toLowerCase()
    .split(/[-_+\s]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
}

/** Everything the address alone tells us - useful when the page blocks us. */
export function hintsFromUrl(url: URL): LinkHints {
  const host = url.hostname.replace(/^www\./, '');

  // merlinsbricks.com/sets/bb-108782, /sets/cobi-2400: brand and number in one.
  const merlin = /merlinsbricks\./.test(host)
    ? /\/sets\/([a-z]+)-([\w-]+?)\/?$/i.exec(url.pathname)
    : null;
  if (merlin) {
    return { manufacturer: canonicalBrand(merlin[1]), setNumber: merlin[2] };
  }

  const tokens = slugTokens(url);
  const setNumber = findSetNumber(tokens);

  let manufacturer: string | undefined;
  for (const token of tokens) {
    manufacturer = canonicalBrand(token);
    if (manufacturer) break;
  }
  manufacturer ??= canonicalBrand(host.split('.').at(-2));

  const words = tokens.filter(
    (token) =>
      token !== setNumber &&
      !/^\d+$/.test(token) &&
      !STOPWORDS.has(token) &&
      !canonicalBrand(token) &&
      token.length > 1,
  );
  const name = words.length > 0 ? words.slice(0, 8).map(titleCase).join(' ') : undefined;

  return { manufacturer, setNumber, name };
}

// --- page data ------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+|#39);/gi, (match, name: string) => ENTITIES[name] ?? match);
}

function metaContent(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.:]/g, '\\$&');
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    'i',
  );
  const match = pattern.exec(html);
  const value = match?.[1] ?? match?.[2];
  return value ? decodeEntities(value).trim() : undefined;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** All schema.org Product objects on the page, however they are nested. */
function jsonLdProducts(html: string): JsonObject[] {
  const products: JsonObject[] = [];
  const pattern = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;

  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isObject(node)) return;
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('Product') || types.includes('ProductGroup')) products.push(node);
    if (node['@graph']) visit(node['@graph']);
  };

  for (const match of html.matchAll(pattern)) {
    try {
      visit(JSON.parse(match[1]!.trim()));
    } catch {
      // A broken block on someone else's page is not our problem.
    }
  }
  return products;
}

function text(value: unknown): string | undefined {
  if (typeof value === 'string') return decodeEntities(value).trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (isObject(value)) return text(value.name) ?? text(value.url);
  if (Array.isArray(value)) return text(value[0]);
  return undefined;
}

function cleanEan(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const ean = normalizeEan(raw);
  return isValidEan(ean) ? ean : undefined;
}

function absoluteUrl(value: string | undefined, base: URL): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** "462 Teile", "450 pieces" in a description. */
function piecesFrom(value: string | undefined): number | undefined {
  const match = value && /(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(?:teilen?|pieces|pcs|steinen?|bausteinen?|parts)\b/i.exec(value);
  if (!match) return undefined;
  const pieces = Number(match[1]!.replace(/[.,]/g, ''));
  return pieces > 0 && pieces < 100_000 ? pieces : undefined;
}

/** "from 2025", "aus 2023", "Jahr: 2021" in a description. */
function yearFrom(value: string | undefined): number | undefined {
  const match = value && /\b(?:from|aus|jahr:?|released|erschienen)\s+((?:19|20)\d{2})\b/i.exec(value);
  return match ? Number(match[1]) : undefined;
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/[‎‏]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Amazon has no schema.org data, but a stable page skeleton: the title in
 * #productTitle, the brand in the byline, pictures as "hiRes" in a script and
 * the facts in the "Produktinformation" table or bullet list.
 */
function hintsFromAmazon(html: string): LinkHints {
  const facts = new Map<string, string>();
  for (const match of html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    facts.set(stripTags(match[1]!).toLowerCase(), stripTags(match[2]!));
  }
  for (const match of html.matchAll(
    /<span class="a-text-bold">([\s\S]*?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    facts.set(stripTags(match[1]!).replace(/[:\s]+$/, '').toLowerCase(), stripTags(match[2]!));
  }
  const fact = (...labels: string[]) => {
    for (const [label, value] of facts) {
      if (labels.some((wanted) => label.includes(wanted))) return value;
    }
    return undefined;
  };

  const title = /id="productTitle"[^>]*>([\s\S]*?)<\/span>/i.exec(html);
  const byline = /id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/i.exec(html);
  const brandText = byline
    ? stripTags(byline[1]!).replace(/^(marke|brand):\s*/i, '').replace(/^besuche den\s+|-store$|\s+store$/gi, '')
    : fact('marke', 'hersteller');
  const image = /"hiRes":"(https:[^"]+)"/.exec(html) ?? /data-old-hires="(https:[^"]+)"/.exec(html);
  const pieces = Number((fact('anzahl der teile', 'teileanzahl', 'anzahl teile') ?? '').replace(/\D/g, ''));

  return {
    manufacturer: canonicalBrand(brandText),
    setNumber: fact('modellnummer', 'herstellerreferenz')?.replace(/\s/g, ''),
    name: title ? stripTags(title[1]!) : undefined,
    ean: cleanEan(fact('ean', 'gtin')),
    imageUrl: image?.[1],
    pieceCount: pieces > 0 && pieces < 100_000 ? pieces : undefined,
  };
}

export function hintsFromHtml(html: string, pageUrl: URL): LinkHints {
  const hints = /(^|\.)amazon\./.test(pageUrl.hostname) ? hintsFromAmazon(html) : hintsFromStructuredData(html, pageUrl);

  // A shop's own article number (an ASIN, a long SKU) is not a set number.
  if (hints.setNumber && !/^[\d-]{3,12}$/.test(hints.setNumber)) delete hints.setNumber;

  // Titles usually carry the number: "LEGO City 60398 Familienhaus".
  if (!hints.setNumber && hints.name) {
    const fromName = findSetNumber(hints.name.toLowerCase().split(/[\s()[\]:,/|]+/).filter(Boolean));
    if (fromName) hints.setNumber = fromName;
  }
  return hints;
}

function hintsFromStructuredData(html: string, pageUrl: URL): LinkHints {
  const product = jsonLdProducts(html)[0];
  const description = text(product?.description) ?? metaContent(html, 'og:description');

  const hints: LinkHints = {
    manufacturer: canonicalBrand(text(product?.brand)) ?? canonicalBrand(metaContent(html, 'product:brand')),
    setNumber: text(product?.mpn) ?? text(product?.sku),
    name: text(product?.name) ?? metaContent(html, 'og:title'),
    ean: cleanEan(product?.gtin13) ?? cleanEan(product?.gtin) ?? cleanEan(product?.gtin12) ?? cleanEan(product?.gtin8),
    imageUrl: absoluteUrl(text(product?.image) ?? metaContent(html, 'og:image'), pageUrl),
    pieceCount: piecesFrom(description),
    year: yearFrom(description),
  };
  return hints;
}

/** First value wins per field: pass the most trusted source first. */
export function mergeHints(...sources: Array<LinkHints | null | undefined>): LinkHints {
  const merged: LinkHints = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [field, value] of Object.entries(source) as Array<[keyof LinkHints, never]>) {
      if (merged[field] === undefined && value !== undefined && value !== '') merged[field] = value;
    }
  }
  return merged;
}

/**
 * Shop titles carry everything: "LEGO® City Familienhaus mit Elektroauto
 * 60398", "BlueBrixx - Technisches Hilfswerk™ Vehicle | Set 108782". Keeps
 * the part that is the set's own name.
 */
export function cleanSetName(name: string, manufacturer?: string, setNumber?: string): string {
  let result = name.replace(/[®™©]/g, '');

  // Site names and set references after a separator.
  result = result.split(/\s+[|•·]\s+/)[0]!;

  // Price-comparison titles: "... ab € 4,20 (2026)", "... ab 52,99 €".
  result = result.replace(/\s+ab\s+(?:€\s*)?\d[\d.,]*\s*(?:€|EUR)?.*$/i, '');

  if (setNumber) {
    const escaped = setNumber.replace(/[-]/g, '\\-');
    result = result.replace(new RegExp(`\\(?\\b${escaped}\\b\\)?`, 'g'), '');
  }

  if (manufacturer) {
    for (const brand of BRANDS.filter((entry) => entry.name === manufacturer)) {
      for (const alias of [brand.name, ...brand.aliases]) {
        if (alias.length < 3) continue;
        result = result.replace(new RegExp(`^\\s*${alias}\\b\\s*[-–:]?\\s*`, 'i'), '');
      }
    }
  }

  return result.replace(/\s{2,}/g, ' ').replace(/^[\s\-–:]+|[\s\-–:,]+$/g, '').trim();
}
