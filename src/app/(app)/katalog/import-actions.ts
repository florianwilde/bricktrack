'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { instruction, manufacturer, set, theme } from '@/db/schema';
import { actionData, actionError, type ActionResult } from '@/lib/action-result';
import {
  fetchImageBytes,
  fetchMinifigCount,
  fetchSet,
  fetchTheme,
  isRebrickableEnabled,
  legoInstructionsUrl,
  RebrickableError,
} from '@/lib/rebrickable';
import { requireUser } from '@/lib/session';
import { uniqueSlug } from '@/lib/slug';
import { storeImageBytes, UploadError } from '@/lib/uploads';

/**
 * Import of a Lego set from Rebrickable.
 *
 * Runs entirely on the server, creates the manufacturer and the theme if they
 * are missing, and stores the picture locally so the catalog keeps working
 * when Rebrickable changes it.
 */

const LEGO_SLUG = 'lego';

function now() {
  return new Date();
}

/** Returns the Lego manufacturer, creating it on first import. */
function ensureLegoManufacturer(): string {
  const existing = db
    .select({ id: manufacturer.id })
    .from(manufacturer)
    .where(eq(manufacturer.slug, LEGO_SLUG))
    .get();
  if (existing) return existing.id;

  const taken = db.select({ slug: manufacturer.slug }).from(manufacturer).all();
  const id = crypto.randomUUID();

  db.insert(manufacturer)
    .values({
      id,
      name: 'Lego',
      slug: uniqueSlug('Lego', taken.map((row) => row.slug)),
      website: 'https://www.lego.com/de-de',
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  return id;
}

/**
 * Maps a Rebrickable theme onto a local one, creating it (and its parent) when
 * needed. Rebrickable nests themes deeply; one level of parent is enough to
 * keep "Technic > Cars" readable without importing the whole tree.
 */
async function ensureTheme(manufacturerId: string, themeId: number | null): Promise<string | null> {
  if (themeId === null) return null;

  const remote = await fetchTheme(themeId);
  if (!remote) return null;

  const existing = db
    .select({ id: theme.id })
    .from(theme)
    .where(and(eq(theme.manufacturerId, manufacturerId), eq(theme.name, remote.name)))
    .get();
  if (existing) return existing.id;

  let parentThemeId: string | null = null;
  if (remote.parentId !== null) {
    const parent = await fetchTheme(remote.parentId);
    if (parent) {
      const existingParent = db
        .select({ id: theme.id })
        .from(theme)
        .where(and(eq(theme.manufacturerId, manufacturerId), eq(theme.name, parent.name)))
        .get();

      if (existingParent) {
        parentThemeId = existingParent.id;
      } else {
        parentThemeId = crypto.randomUUID();
        db.insert(theme)
          .values({
            id: parentThemeId,
            manufacturerId,
            name: parent.name,
            createdAt: now(),
            updatedAt: now(),
          })
          .run();
      }
    }
  }

  const id = crypto.randomUUID();
  db.insert(theme)
    .values({
      id,
      manufacturerId,
      name: remote.name,
      parentThemeId,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  return id;
}

export type ImportResult = {
  setId: string;
  setNumber: string;
  name: string;
  imported: {
    image: boolean;
    theme: boolean;
    minifigs: boolean;
  };
};

export async function importSetFromRebrickable(
  rawSetNumber: unknown,
): Promise<ActionResult<ImportResult>> {
  await requireUser();

  if (!isRebrickableEnabled()) {
    return actionError(
      'Der Import ist nicht eingerichtet. Trag REBRICKABLE_API_KEY in der .env ein und starte den Container neu.',
    );
  }

  const setNumber = typeof rawSetNumber === 'string' ? rawSetNumber.trim() : '';
  if (!setNumber) return actionError('Bitte gib eine Setnummer ein.');
  if (setNumber.length > 40) return actionError('Das sieht nicht nach einer Setnummer aus.');

  let remote;
  try {
    remote = await fetchSet(setNumber);
  } catch (error) {
    if (error instanceof RebrickableError) return actionError(error.message);
    throw error;
  }

  if (!remote) {
    return actionError(
      `Rebrickable kennt die Setnummer ${setNumber} nicht. Du kannst das Set von Hand anlegen.`,
    );
  }

  const manufacturerId = ensureLegoManufacturer();

  const duplicate = db
    .select({ id: set.id })
    .from(set)
    .where(and(eq(set.manufacturerId, manufacturerId), eq(set.setNumber, remote.setNumber)))
    .get();
  if (duplicate) {
    return actionError(`${remote.setNumber} ist schon im Katalog: ${remote.name}.`);
  }

  const themeId = await ensureTheme(manufacturerId, remote.themeId);
  const minifigCount = await fetchMinifigCount(remote.setNumber);

  const setId = crypto.randomUUID();

  // Cache the picture locally; a failed download must not fail the import.
  let imagePath: string | null = null;
  if (remote.imageUrl) {
    const bytes = await fetchImageBytes(remote.imageUrl);
    if (bytes) {
      try {
        imagePath = (await storeImageBytes(bytes, 'set-image', setId)).filePath;
      } catch (error) {
        if (!(error instanceof UploadError)) throw error;
        console.error('[import] Bild konnte nicht gespeichert werden', error);
      }
    }
  }

  db.insert(set)
    .values({
      id: setId,
      manufacturerId,
      themeId,
      setNumber: remote.setNumber,
      name: remote.name,
      year: remote.year,
      pieceCount: remote.pieceCount,
      minifigCount,
      imagePath,
      // Keep the source URL as a fallback if the local file is ever lost.
      imageUrl: imagePath ? null : remote.imageUrl,
      externalIds: { rebrickable: `${remote.setNumber}-1` },
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  // Rebrickable does not serve instruction files, so this points at Lego's
  // own service page for the set number.
  db.insert(instruction)
    .values({
      id: crypto.randomUUID(),
      setId,
      kind: 'external_url',
      url: legoInstructionsUrl(remote.setNumber),
      label: 'Bauanleitung bei LEGO',
      sortOrder: 0,
      createdAt: now(),
    })
    .run();

  revalidatePath('/katalog');
  revalidatePath('/verwaltung/themen');

  return actionData({
    setId,
    setNumber: remote.setNumber,
    name: remote.name,
    imported: {
      image: imagePath !== null,
      theme: themeId !== null,
      minifigs: minifigCount !== null,
    },
  });
}
