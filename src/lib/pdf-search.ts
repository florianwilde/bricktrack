/**
 * Text search inside a building instruction (pure, testable).
 *
 * pdf.js hands out the text of a page as positioned fragments. Instructions
 * are mostly pictures; what text there is - parts lists with element and
 * design numbers, step numbers, notes like "2x" - is short and often split
 * oddly. So matching is forgiving: case, umlauts and whitespace do not count.
 */

/** Lowercase, without accents and with all whitespace removed. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export type PageHit = {
  /** 1-based, like the page counter in the viewer. */
  page: number;
  /** How often the query occurs on this page. */
  count: number;
  /** A short piece of the page text around the first occurrence. */
  snippet: string;
};

const SNIPPET_RADIUS = 30;

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * Builds the snippet from the original text so it reads naturally, even
 * though matching ignores whitespace: walks the original characters and maps
 * the match back to their positions.
 */
function snippetFor(original: string, needle: string): string {
  const positions: number[] = [];
  let normalized = '';
  for (let i = 0; i < original.length; i += 1) {
    const piece = normalizeForSearch(original[i] ?? '');
    for (const char of piece) {
      normalized += char;
      positions.push(i);
    }
  }

  const at = normalized.indexOf(needle);
  if (at === -1) return original.slice(0, SNIPPET_RADIUS * 2).trim();

  const start = positions[at] ?? 0;
  const end = (positions[at + needle.length - 1] ?? start) + 1;
  const from = Math.max(0, start - SNIPPET_RADIUS);
  const to = Math.min(original.length, end + SNIPPET_RADIUS);

  const text = original.slice(from, to).replace(/\s+/g, ' ').trim();
  return `${from > 0 ? '…' : ''}${text}${to < original.length ? '…' : ''}`;
}

/** Pages that contain the query, in page order. Empty for a blank query. */
export function searchPages(pages: string[], query: string): PageHit[] {
  const needle = normalizeForSearch(query);
  if (needle.length === 0) return [];

  const hits: PageHit[] = [];
  pages.forEach((text, index) => {
    const count = countOccurrences(normalizeForSearch(text), needle);
    if (count > 0) hits.push({ page: index + 1, count, snippet: snippetFor(text, needle) });
  });
  return hits;
}

/**
 * Which text fragments of one page to highlight. A query can span fragments
 * ("60398" split into "603" and "98"), so the page text is matched as a whole
 * and every fragment that takes part in a match is marked.
 */
export function fragmentsToHighlight(fragments: string[], query: string): number[] {
  const needle = normalizeForSearch(query);
  if (needle.length === 0) return [];

  const owner: number[] = [];
  let joined = '';
  fragments.forEach((fragment, index) => {
    const normalized = normalizeForSearch(fragment);
    joined += normalized;
    for (let i = 0; i < normalized.length; i += 1) owner.push(index);
  });

  const marked = new Set<number>();
  let at = joined.indexOf(needle);
  while (at !== -1) {
    for (let i = at; i < at + needle.length; i += 1) {
      const index = owner[i];
      if (index !== undefined) marked.add(index);
    }
    at = joined.indexOf(needle, at + needle.length);
  }
  return [...marked].sort((a, b) => a - b);
}

/** The next hit after the current page, wrapping around; `null` without hits. */
export function nextHitPage(hits: PageHit[], currentPage: number, direction: 1 | -1): number | null {
  if (hits.length === 0) return null;
  if (direction === 1) {
    return (hits.find((hit) => hit.page > currentPage) ?? hits[0])?.page ?? null;
  }
  return ([...hits].reverse().find((hit) => hit.page < currentPage) ?? hits[hits.length - 1])?.page ?? null;
}
