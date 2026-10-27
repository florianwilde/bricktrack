'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { collectionItem, instruction, photo, set } from '@/db/schema';
import { actionData, actionError, actionOk, formToObject, parseForm, type ActionResult } from '@/lib/action-result';
import { env } from '@/env';
import { safeFetch, SafeFetchError } from '@/lib/safe-fetch';
import { requireUser } from '@/lib/session';
import { deleteStoredFile, storeImage, storeImageBytes, storePdf, UploadError } from '@/lib/uploads';
import { optionalText, optionalUrl, setSchema } from '@/lib/validation';
import { z } from 'zod';

function now() {
  return new Date();
}

function revalidateSet(id?: string) {
  revalidatePath('/katalog');
  revalidatePath('/sammlung');
  if (id) revalidatePath(`/katalog/${id}`);
}

async function cacheRemoteImage(url: string, setId: string): Promise<string | null> {
  try {
    const response = await safeFetch(url, {
      accept: 'image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5',
      maxBytes: env.MAX_UPLOAD_BYTES,
    });
    if (response.status !== 200) return null;
    return (await storeImageBytes(response.body, 'set-image', setId)).filePath;
  } catch (error) {
    if (error instanceof SafeFetchError || error instanceof UploadError) {
      console.error('[katalog] Bild konnte nicht übernommen werden', url, error.message);
      return null;
    }
    throw error;
  }
}

function fileFrom(formData: FormData, field: string): File | null {
  const value = formData.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export async function createSet(formData: FormData): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const parsed = parseForm(setSchema, formToObject(formData));
  if (!parsed.ok) return parsed;

  const clash = db
    .select({ id: set.id })
    .from(set)
    .where(
      and(
        eq(set.manufacturerId, parsed.data.manufacturerId),
        eq(set.setNumber, parsed.data.setNumber),
      ),
    )
    .get();
  if (clash) {
    return actionError('Dieses Set gibt es beim gewählten Hersteller schon.');
  }

  const id = crypto.randomUUID();
  let imagePath: string | null = null;

  const image = fileFrom(formData, 'image');
  if (image) {
    try {
      imagePath = (await storeImage(image, 'set-image', id)).filePath;
    } catch (error) {
      if (error instanceof UploadError) return actionError(error.message);
      throw error;
    }
  } else if (formData.get('cacheImage') === 'on' && parsed.data.imageUrl) {
    // A picture found by the link import is kept locally, like the Lego
    // import does. If that fails, the URL stays as the fallback.
    imagePath = await cacheRemoteImage(parsed.data.imageUrl, id);
  }

  db.insert(set)
    .values({
      id,
      ...parsed.data,
      imageUrl: imagePath ? null : parsed.data.imageUrl,
      imagePath,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidateSet(id);
  return actionData({ id });
}

export async function updateSet(id: string, formData: FormData): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(setSchema, formToObject(formData));
  if (!parsed.ok) return parsed;

  const existing = db.select().from(set).where(eq(set.id, id)).get();
  if (!existing) return actionError('Das Set gibt es nicht mehr.');

  const clash = db
    .select({ id: set.id })
    .from(set)
    .where(
      and(
        eq(set.manufacturerId, parsed.data.manufacturerId),
        eq(set.setNumber, parsed.data.setNumber),
        ne(set.id, id),
      ),
    )
    .get();
  if (clash) return actionError('Ein anderes Set des Herstellers hat diese Nummer bereits.');

  let imagePath = existing.imagePath;
  const image = fileFrom(formData, 'image');
  if (image) {
    try {
      const stored = await storeImage(image, 'set-image', id);
      await deleteStoredFile(existing.imagePath);
      imagePath = stored.filePath;
    } catch (error) {
      if (error instanceof UploadError) return actionError(error.message);
      throw error;
    }
  } else if (formData.get('removeImage') === 'on') {
    await deleteStoredFile(existing.imagePath);
    imagePath = null;
  }

  db.update(set)
    .set({ ...parsed.data, imagePath, updatedAt: now() })
    .where(eq(set.id, id))
    .run();

  revalidateSet(id);
  return actionOk();
}

export async function deleteSet(id: string): Promise<ActionResult> {
  await requireUser();

  const existing = db.select().from(set).where(eq(set.id, id)).get();
  if (!existing) return actionOk();

  const files = [
    existing.imagePath,
    ...db
      .select({ path: photo.filePath, thumb: photo.thumbnailPath })
      .from(photo)
      .where(eq(photo.setId, id))
      .all()
      .flatMap((row) => [row.path, row.thumb]),
    // Owned copies go with the set, and their photos with them.
    ...db
      .select({ path: photo.filePath, thumb: photo.thumbnailPath })
      .from(photo)
      .innerJoin(collectionItem, eq(photo.collectionItemId, collectionItem.id))
      .where(eq(collectionItem.setId, id))
      .all()
      .flatMap((row) => [row.path, row.thumb]),
    ...db
      .select({ path: instruction.filePath })
      .from(instruction)
      .where(eq(instruction.setId, id))
      .all()
      .map((row) => row.path),
  ];

  // Rows go first: if a file is already gone the delete still has to succeed.
  db.delete(set).where(eq(set.id, id)).run();
  await Promise.all(files.map((file) => deleteStoredFile(file)));

  revalidateSet(id);
  return actionOk();
}

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

const instructionUrlSchema = z.object({
  label: optionalText(80),
  url: optionalUrl,
});

export async function addInstructionPdf(setId: string, formData: FormData): Promise<ActionResult> {
  await requireUser();

  const file = fileFrom(formData, 'file');
  if (!file) return actionError('Bitte wähle eine PDF-Datei aus.');

  const parsed = parseForm(z.object({ label: optionalText(80) }), formToObject(formData));
  if (!parsed.ok) return parsed;

  try {
    const stored = await storePdf(file, setId);
    db.insert(instruction)
      .values({
        id: crypto.randomUUID(),
        setId,
        kind: 'pdf_upload',
        filePath: stored.filePath,
        fileSizeBytes: stored.fileSizeBytes,
        label: parsed.data.label,
        sortOrder: nextInstructionSortOrder(setId),
        createdAt: now(),
      })
      .run();
  } catch (error) {
    if (error instanceof UploadError) return actionError(error.message);
    throw error;
  }

  revalidateSet(setId);
  return actionOk();
}

export async function addInstructionUrl(setId: string, input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = parseForm(instructionUrlSchema, input);
  if (!parsed.ok) return parsed;
  if (!parsed.data.url) return actionError('Bitte gib die Adresse der Anleitung an.');

  db.insert(instruction)
    .values({
      id: crypto.randomUUID(),
      setId,
      kind: 'external_url',
      url: parsed.data.url,
      label: parsed.data.label,
      sortOrder: nextInstructionSortOrder(setId),
      createdAt: now(),
    })
    .run();

  revalidateSet(setId);
  return actionOk();
}

export async function deleteInstruction(id: string): Promise<ActionResult> {
  await requireUser();

  const existing = db.select().from(instruction).where(eq(instruction.id, id)).get();
  if (!existing) return actionOk();

  db.delete(instruction).where(eq(instruction.id, id)).run();
  await deleteStoredFile(existing.filePath);

  revalidateSet(existing.setId);
  return actionOk();
}

function nextInstructionSortOrder(setId: string): number {
  const rows = db
    .select({ sortOrder: instruction.sortOrder })
    .from(instruction)
    .where(eq(instruction.setId, setId))
    .all();
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function addSetPhoto(setId: string, formData: FormData): Promise<ActionResult> {
  await requireUser();

  const file = fileFrom(formData, 'file');
  if (!file) return actionError('Bitte wähle ein Bild aus.');

  const parsed = parseForm(z.object({ caption: optionalText(160) }), formToObject(formData));
  if (!parsed.ok) return parsed;

  try {
    const stored = await storeImage(file, 'photo', setId);
    db.insert(photo)
      .values({
        id: crypto.randomUUID(),
        setId,
        filePath: stored.filePath,
        thumbnailPath: stored.thumbnailPath,
        caption: parsed.data.caption,
        sortOrder: 0,
        createdAt: now(),
      })
      .run();
  } catch (error) {
    if (error instanceof UploadError) return actionError(error.message);
    throw error;
  }

  revalidateSet(setId);
  return actionOk();
}

/**
 * A photo of one owned copy - the scratch on the box, the build in the
 * shelf. Stored under photos/<itemId>, so like set photos only with a session.
 */
export async function addCollectionItemPhoto(
  collectionItemId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const item = db
    .select({ setId: collectionItem.setId })
    .from(collectionItem)
    .where(eq(collectionItem.id, collectionItemId))
    .get();
  if (!item) return actionError('Diesen Sammlungseintrag gibt es nicht mehr.');

  const file = fileFrom(formData, 'file');
  if (!file) return actionError('Bitte wähle ein Bild aus.');

  const parsed = parseForm(z.object({ caption: optionalText(160) }), formToObject(formData));
  if (!parsed.ok) return parsed;

  try {
    const stored = await storeImage(file, 'photo', collectionItemId);
    db.insert(photo)
      .values({
        id: crypto.randomUUID(),
        collectionItemId,
        filePath: stored.filePath,
        thumbnailPath: stored.thumbnailPath,
        caption: parsed.data.caption,
        sortOrder: 0,
        createdAt: now(),
      })
      .run();
  } catch (error) {
    if (error instanceof UploadError) return actionError(error.message);
    throw error;
  }

  revalidateSet(item.setId);
  return actionOk();
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  await requireUser();

  const existing = db.select().from(photo).where(eq(photo.id, id)).get();
  if (!existing) return actionOk();

  db.delete(photo).where(eq(photo.id, id)).run();
  await Promise.all([
    deleteStoredFile(existing.filePath),
    deleteStoredFile(existing.thumbnailPath),
  ]);

  if (existing.setId) revalidateSet(existing.setId);
  if (existing.collectionItemId) {
    const item = db
      .select({ setId: collectionItem.setId })
      .from(collectionItem)
      .where(eq(collectionItem.id, existing.collectionItemId))
      .get();
    revalidateSet(item?.setId);
  }
  return actionOk();
}
