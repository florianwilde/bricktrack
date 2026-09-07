import 'server-only';
import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { location, manufacturer, set, theme } from '@/db/schema';

export function listManufacturers() {
  return db
    .select({
      id: manufacturer.id,
      name: manufacturer.name,
      slug: manufacturer.slug,
      website: manufacturer.website,
      setCount: count(set.id),
    })
    .from(manufacturer)
    .leftJoin(set, eq(set.manufacturerId, manufacturer.id))
    .groupBy(manufacturer.id)
    .orderBy(asc(manufacturer.name))
    .all();
}

export function listThemes() {
  const parent = sql<string | null>`(
    select parent.name from theme as parent where parent.id = ${theme.parentThemeId}
  )`.as('parent_name');

  return db
    .select({
      id: theme.id,
      name: theme.name,
      manufacturerId: theme.manufacturerId,
      manufacturerName: manufacturer.name,
      parentThemeId: theme.parentThemeId,
      parentName: parent,
    })
    .from(theme)
    .innerJoin(manufacturer, eq(manufacturer.id, theme.manufacturerId))
    .orderBy(asc(manufacturer.name), asc(theme.name))
    .all();
}

/** Themes of one manufacturer - used by the set form and the catalog filter. */
export function listThemesByManufacturer(manufacturerId: string) {
  return db
    .select({ id: theme.id, name: theme.name })
    .from(theme)
    .where(eq(theme.manufacturerId, manufacturerId))
    .orderBy(asc(theme.name))
    .all();
}

export function listLocations() {
  const parent = sql<string | null>`(
    select parent.name from location as parent where parent.id = ${location.parentLocationId}
  )`.as('parent_name');

  return db
    .select({
      id: location.id,
      name: location.name,
      parentLocationId: location.parentLocationId,
      parentName: parent,
    })
    .from(location)
    .orderBy(asc(location.name))
    .all();
}

export type ManufacturerListRow = ReturnType<typeof listManufacturers>[number];
export type ThemeListRow = ReturnType<typeof listThemes>[number];
export type LocationListRow = ReturnType<typeof listLocations>[number];
