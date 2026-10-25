'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { manufacturer, set } from '@/db/schema';
import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import {
  cleanSetName,
  hintsFromHtml,
  hintsFromUrl,
  mergeHints,
  sourceLabel,
  type LinkHints,
} from '@/lib/link-import';
import { fetchMinifigCount, fetchSet, isRebrickableEnabled, RebrickableError } from '@/lib/rebrickable';
import { safeFetch, SafeFetchError } from '@/lib/safe-fetch';
import { requireUser } from '@/lib/session';
import { uniqueSlug } from '@/lib/slug';

/**
 * "Aus einem Link übernehmen": reads a set out of a shop, price-comparison or
 * database link and returns a draft for the form. Nothing is saved here except
 * a missing manufacturer - the form needs it to be selectable.
 *
 * Amazon, idealo and geizhals usually refuse requests from a server; then the
 * link itself (brand, number, words in the address) is the starting point,
 * and Rebrickable (Lego) or Merlins Bricks (BlueBrixx, Cobi) fill in the rest.
 */

export type LinkPreview = {
  manufacturerId: string | null;
  manufacturerName: string | null;
  setNumber: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  minifigCount: number | null;
  ean: string;
  imageUrl: string;
  sourceUrl: string;
  /** Where the data came from, for the confirmation message. */
  sources: string[];
  /** The shop did not let us read the page; only the address was used. */
  pageBlocked: boolean;
  /** The set is already in the catalog. */
  existingSetId: string | null;
};

const inputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Bitte einen Link einfügen.')
    .max(2000, 'Der Link ist zu lang.')
    .url('Das ist kein gültiger Link.')
    .refine((value) => /^https?:\/\//i.test(value), 'Nur http- und https-Links.'),
});

/** Manufacturer website for the ones we create on the fly. */
const WEBSITES: Record<string, string> = {
  Lego: 'https://www.lego.com/de-de',
  Playmobil: 'https://www.playmobil.de',
  Cobi: 'https://cobi.pl',
  BlueBrixx: 'https://www.bluebrixx.com',
  'Mega Bloks': 'https://www.megabrands.com',
};

/** Merlins Bricks keys its set pages by a brand prefix. */
const MERLIN_PREFIX: Record<string, string> = { BlueBrixx: 'bb', Cobi: 'cobi' };

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ensureManufacturer(name: string): string {
  const rows = db
    .select({ id: manufacturer.id, name: manufacturer.name, slug: manufacturer.slug })
    .from(manufacturer)
    .all();

  const match = rows.find((row) => key(row.name) === key(name) || row.slug === key(name));
  if (match) return match.id;

  const id = crypto.randomUUID();
  const now = new Date();
  db.insert(manufacturer)
    .values({
      id,
      name,
      slug: uniqueSlug(name, rows.map((row) => row.slug)),
      website: WEBSITES[name] ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

async function readPage(url: URL): Promise<{ hints: LinkHints | null; finalUrl: URL; blocked: boolean }> {
  const response = await safeFetch(url);
  const finalUrl = new URL(response.url);
  const isHtml = /html|xml/i.test(response.contentType);

  if (response.status !== 200 || !isHtml) return { hints: null, finalUrl, blocked: true };
  return { hints: hintsFromHtml(response.body.toString('utf8'), finalUrl), finalUrl, blocked: false };
}

async function fromRebrickable(setNumber: string): Promise<(LinkHints & { minifigCount?: number }) | null> {
  if (!isRebrickableEnabled()) return null;
  try {
    const remote = await fetchSet(setNumber);
    if (!remote) return null;
    const minifigs = await fetchMinifigCount(remote.setNumber);
    return {
      name: remote.name,
      year: remote.year ?? undefined,
      pieceCount: remote.pieceCount ?? undefined,
      imageUrl: remote.imageUrl ?? undefined,
      minifigCount: minifigs ?? undefined,
    };
  } catch (error) {
    if (error instanceof RebrickableError) return null;
    throw error;
  }
}

async function fromMerlinsBricks(brand: string, setNumber: string): Promise<LinkHints | null> {
  const prefix = MERLIN_PREFIX[brand];
  if (!prefix || !/^[\w-]+$/.test(setNumber)) return null;
  try {
    const page = await readPage(new URL(`https://www.merlinsbricks.com/sets/${prefix}-${setNumber}/`));
    return page.hints;
  } catch {
    return null;
  }
}

export async function previewSetFromLink(input: unknown): Promise<ActionResult<LinkPreview>> {
  await requireUser();

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return actionError(parsed.error.issues[0]?.message ?? 'Ungültiger Link.');

  const url = new URL(parsed.data.url);
  const sources: string[] = [];

  // 1. The page itself, if it lets us in. A short link (amzn.eu/...) still
  //    tells us where it leads, even when the target then refuses.
  let pageHints: LinkHints | null = null;
  let finalUrl = url;
  let pageBlocked = true;
  try {
    const page = await readPage(url);
    pageHints = page.hints;
    finalUrl = page.finalUrl;
    pageBlocked = page.blocked;
  } catch (error) {
    if (!(error instanceof SafeFetchError)) throw error;
    if (/intern/i.test(error.message)) return actionError(error.message);
  }
  if (pageHints) sources.push(sourceLabel(finalUrl));

  // 2. The address.
  const addressHints = mergeHints(hintsFromUrl(finalUrl), hintsFromUrl(url));
  if (!pageHints || pageBlocked) sources.push(`Link (${sourceLabel(finalUrl)})`);

  let hints = mergeHints(pageHints, addressHints);
  let minifigCount: number | null = null;

  // 3. A set database for the brand.
  if (hints.manufacturer === 'Lego' && hints.setNumber) {
    const remote = await fromRebrickable(hints.setNumber);
    if (remote) {
      // The shop's German name beats Rebrickable's English one; Rebrickable's
      // facts and clean picture beat the shop's.
      hints = mergeHints({ name: pageHints?.name ?? addressHints.name, ean: hints.ean }, remote, hints);
      minifigCount = remote.minifigCount ?? null;
      sources.push('Rebrickable');
    }
  } else if (hints.manufacturer && hints.setNumber && !/merlinsbricks\./.test(finalUrl.hostname)) {
    const merlin = await fromMerlinsBricks(hints.manufacturer, hints.setNumber);
    if (merlin) {
      hints = mergeHints(hints, merlin);
      sources.push('Merlins Bricks');
    }
  }

  if (!hints.name && !hints.setNumber) {
    return actionError(
      pageBlocked
        ? `${sourceLabel(finalUrl)} lässt keine Abfrage zu, und der Link selbst verrät nichts über das Set. Versuch es mit einem anderen Link oder trag das Set von Hand ein.`
        : 'Auf der Seite stehen keine Produktdaten, mit denen sich etwas anfangen lässt.',
    );
  }

  const manufacturerName = hints.manufacturer ?? null;
  const manufacturerId = manufacturerName ? ensureManufacturer(manufacturerName) : null;
  const setNumber = hints.setNumber ?? '';

  const existing =
    manufacturerId && setNumber
      ? db
          .select({ id: set.id })
          .from(set)
          .where(and(eq(set.manufacturerId, manufacturerId), eq(set.setNumber, setNumber)))
          .get()
      : undefined;

  return actionData({
    manufacturerId,
    manufacturerName,
    setNumber,
    name: hints.name ? cleanSetName(hints.name, manufacturerName ?? undefined, setNumber) : '',
    year: hints.year ?? null,
    pieceCount: hints.pieceCount ?? null,
    minifigCount,
    ean: hints.ean ?? '',
    imageUrl: hints.imageUrl ?? '',
    sourceUrl: url.toString(),
    sources,
    pageBlocked,
    existingSetId: existing?.id ?? null,
  });
}
