import 'server-only';
import { env } from '@/env';
import { displaySetNumber, normalizeSetNumber } from './set-number';

export { displaySetNumber, legoInstructionsUrl, normalizeSetNumber } from './set-number';

/**
 * Rebrickable lookup for Lego sets.
 *
 * Entirely optional: without REBRICKABLE_API_KEY the import stays switched
 * off and everything keeps working by hand. Every request runs here on the
 * server - the browser never talks to rebrickable.com.
 */

const API_BASE = 'https://rebrickable.com/api/v3/lego';
const REQUEST_TIMEOUT_MS = 10_000;

export function isRebrickableEnabled(): boolean {
  return Boolean(env.REBRICKABLE_API_KEY);
}

export class RebrickableError extends Error {}

export type RebrickableSet = {
  setNumber: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  themeId: number | null;
  imageUrl: string | null;
  externalUrl: string | null;
};

export type RebrickableTheme = {
  id: number;
  name: string;
  parentId: number | null;
};

async function request<T>(path: string): Promise<T | null> {
  const key = env.REBRICKABLE_API_KEY;
  if (!key) throw new RebrickableError('Für den Import fehlt der Rebrickable-API-Key.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `key ${key}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // The catalog is not a moving target; a day of caching is plenty.
      next: { revalidate: 86_400 },
    });
  } catch (error) {
    console.error('[rebrickable] Anfrage fehlgeschlagen', path, error);
    throw new RebrickableError('Rebrickable ist gerade nicht erreichbar.');
  }

  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) {
    throw new RebrickableError('Der Rebrickable-API-Key wird abgelehnt. Bitte prüf ihn.');
  }
  if (response.status === 429) {
    throw new RebrickableError('Rebrickable drosselt gerade. Bitte in einer Minute noch einmal.');
  }
  if (!response.ok) {
    throw new RebrickableError(`Rebrickable antwortet mit Status ${response.status}.`);
  }

  return (await response.json()) as T;
}

type SetResponse = {
  set_num: string;
  name: string;
  year: number | null;
  theme_id: number | null;
  num_parts: number | null;
  set_img_url: string | null;
  set_url: string | null;
};

export async function fetchSet(setNumber: string): Promise<RebrickableSet | null> {
  const data = await request<SetResponse>(`/sets/${encodeURIComponent(normalizeSetNumber(setNumber))}/`);
  if (!data) return null;

  return {
    setNumber: displaySetNumber(data.set_num),
    name: data.name,
    year: data.year ?? null,
    pieceCount: data.num_parts ?? null,
    themeId: data.theme_id ?? null,
    imageUrl: data.set_img_url ?? null,
    externalUrl: data.set_url ?? null,
  };
}

type ThemeResponse = { id: number; name: string; parent_id: number | null };

export async function fetchTheme(themeId: number): Promise<RebrickableTheme | null> {
  const data = await request<ThemeResponse>(`/themes/${themeId}/`);
  if (!data) return null;
  return { id: data.id, name: data.name, parentId: data.parent_id ?? null };
}

type MinifigsResponse = { results: Array<{ quantity: number | null }> };

/** Number of minifigures, or null when the lookup does not work out. */
export async function fetchMinifigCount(setNumber: string): Promise<number | null> {
  try {
    const data = await request<MinifigsResponse>(
      `/sets/${encodeURIComponent(normalizeSetNumber(setNumber))}/minifigs/`,
    );
    if (!data) return null;
    return data.results.reduce((total, row) => total + (row.quantity ?? 0), 0);
  } catch {
    // A missing minifig list must not fail the whole import.
    return null;
  }
}

/**
 * Downloads the set image so it keeps working when Rebrickable changes or
 * removes it. Returns null instead of throwing: an import without a picture
 * is still a good import.
 */
export async function fetchImageBytes(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.byteLength > 0 ? buffer : null;
  } catch (error) {
    console.error('[rebrickable] Bild konnte nicht geladen werden', url, error);
    return null;
  }
}

