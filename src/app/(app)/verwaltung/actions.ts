'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { location, manufacturer, set, theme } from '@/db/schema';
import { actionError, actionOk, parseForm, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/session';
import { uniqueSlug } from '@/lib/slug';
import { locationSchema, manufacturerSchema, themeSchema } from '@/lib/validation';

function now() {
  return new Date();
}

function revalidateMasterData() {
  revalidatePath('/verwaltung/hersteller');
  revalidatePath('/verwaltung/themen');
  revalidatePath('/verwaltung/standorte');
  revalidatePath('/katalog');
}

// ---------------------------------------------------------------------------
// Manufacturers
// ---------------------------------------------------------------------------

export async function createManufacturer(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(manufacturerSchema, input);
  if (!parsed.ok) return parsed;

  const taken = db.select({ slug: manufacturer.slug }).from(manufacturer).all();
  const exists = db
    .select({ id: manufacturer.id })
    .from(manufacturer)
    .where(eq(manufacturer.name, parsed.data.name))
    .get();
  if (exists) return actionError('Diesen Hersteller gibt es schon.');

  db.insert(manufacturer)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      slug: uniqueSlug(
        parsed.data.name,
        taken.map((row) => row.slug),
      ),
      website: parsed.data.website,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidateMasterData();
  return actionOk();
}

export async function updateManufacturer(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(manufacturerSchema, input);
  if (!parsed.ok) return parsed;

  const clash = db
    .select({ id: manufacturer.id })
    .from(manufacturer)
    .where(and(eq(manufacturer.name, parsed.data.name), ne(manufacturer.id, id)))
    .get();
  if (clash) return actionError('Ein anderer Hersteller heißt bereits so.');

  db.update(manufacturer)
    .set({ name: parsed.data.name, website: parsed.data.website, updatedAt: now() })
    .where(eq(manufacturer.id, id))
    .run();

  revalidateMasterData();
  return actionOk();
}

export async function deleteManufacturer(id: string): Promise<ActionResult> {
  await requireUser();

  const used = db.select({ id: set.id }).from(set).where(eq(set.manufacturerId, id)).get();
  if (used) {
    return actionError(
      'Der Hersteller wird noch von mindestens einem Set verwendet und kann deshalb nicht gelöscht werden.',
    );
  }

  db.delete(manufacturer).where(eq(manufacturer.id, id)).run();
  revalidateMasterData();
  return actionOk();
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export async function createTheme(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(themeSchema, input);
  if (!parsed.ok) return parsed;

  const exists = db
    .select({ id: theme.id })
    .from(theme)
    .where(
      and(eq(theme.manufacturerId, parsed.data.manufacturerId), eq(theme.name, parsed.data.name)),
    )
    .get();
  if (exists) return actionError('Dieses Thema gibt es beim Hersteller schon.');

  db.insert(theme)
    .values({
      id: crypto.randomUUID(),
      manufacturerId: parsed.data.manufacturerId,
      name: parsed.data.name,
      parentThemeId: parsed.data.parentThemeId,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidateMasterData();
  return actionOk();
}

export async function updateTheme(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(themeSchema, input);
  if (!parsed.ok) return parsed;

  if (parsed.data.parentThemeId === id) {
    return actionError('Ein Thema kann nicht sein eigenes Oberthema sein.');
  }

  const clash = db
    .select({ id: theme.id })
    .from(theme)
    .where(
      and(
        eq(theme.manufacturerId, parsed.data.manufacturerId),
        eq(theme.name, parsed.data.name),
        ne(theme.id, id),
      ),
    )
    .get();
  if (clash) return actionError('Ein anderes Thema dieses Herstellers heißt bereits so.');

  db.update(theme)
    .set({
      manufacturerId: parsed.data.manufacturerId,
      name: parsed.data.name,
      parentThemeId: parsed.data.parentThemeId,
      updatedAt: now(),
    })
    .where(eq(theme.id, id))
    .run();

  revalidateMasterData();
  return actionOk();
}

export async function deleteTheme(id: string): Promise<ActionResult> {
  await requireUser();

  // Sets keep existing without a theme (ON DELETE SET NULL), but silently
  // unthemeing a dozen sets would be a surprise - so we ask for a decision.
  const used = db.select({ id: set.id }).from(set).where(eq(set.themeId, id)).get();
  if (used) {
    return actionError(
      'Dem Thema sind noch Sets zugeordnet. Ordne sie zuerst um, dann lässt sich das Thema löschen.',
    );
  }

  db.delete(theme).where(eq(theme.id, id)).run();
  revalidateMasterData();
  return actionOk();
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function createLocation(input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(locationSchema, input);
  if (!parsed.ok) return parsed;

  db.insert(location)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      parentLocationId: parsed.data.parentLocationId,
      createdAt: now(),
      updatedAt: now(),
    })
    .run();

  revalidatePath('/verwaltung/standorte');
  revalidatePath('/sammlung');
  return actionOk();
}

export async function updateLocation(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = parseForm(locationSchema, input);
  if (!parsed.ok) return parsed;

  if (parsed.data.parentLocationId === id) {
    return actionError('Ein Standort kann nicht in sich selbst liegen.');
  }

  db.update(location)
    .set({
      name: parsed.data.name,
      parentLocationId: parsed.data.parentLocationId,
      updatedAt: now(),
    })
    .where(eq(location.id, id))
    .run();

  revalidatePath('/verwaltung/standorte');
  revalidatePath('/sammlung');
  return actionOk();
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  await requireUser();

  // Collection items only lose their location (ON DELETE SET NULL).
  db.delete(location).where(eq(location.id, id)).run();

  revalidatePath('/verwaltung/standorte');
  revalidatePath('/sammlung');
  return actionOk();
}
