/**
 * Nested storage places (pure, testable): "Keller › Regal › Kiste 3".
 *
 * Locations form a tree through `parent_location_id`. The form prevents a
 * location from being its own parent, but a longer loop (A in B, B in A) is
 * still possible, so every walk here stops at a node it has already seen.
 */

export type LocationNode = { id: string; name: string; parentLocationId: string | null };

/** Names from the outermost place down to this one. */
export function locationPath(id: string, locations: LocationNode[]): string[] {
  const byId = new Map(locations.map((row) => [row.id, row]));
  const names: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    names.unshift(current.name);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : undefined;
  }
  return names;
}

/** This location and everything inside it, at any depth. */
export function locationWithDescendants(id: string, locations: LocationNode[]): string[] {
  const children = new Map<string, string[]>();
  for (const row of locations) {
    if (!row.parentLocationId) continue;
    children.set(row.parentLocationId, [...(children.get(row.parentLocationId) ?? []), row.id]);
  }

  const result: string[] = [];
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    queue.push(...(children.get(next) ?? []));
  }
  return result;
}

/** Path a location label points to: the collection, filtered to this place, for everyone. */
export function locationContentsPath(id: string): string {
  return `/sammlung?standort=${encodeURIComponent(id)}&sammler=alle`;
}

/**
 * Reads a scanned code. Labels carry the full address of the instance; only a
 * code for this very instance and its collection page counts, so a QR code
 * on some shop's box does not send the app anywhere.
 */
export function parseLocationLabel(text: string, origin: string): string | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.origin !== origin || url.pathname !== '/sammlung') return null;
  const id = url.searchParams.get('standort');
  return id ? `${url.pathname}${url.search}` : null;
}
