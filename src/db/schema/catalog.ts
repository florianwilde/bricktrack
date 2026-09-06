import { sql, type AnyColumn } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const manufacturer = sqliteTable('manufacturer', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  website: text('website'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const theme = sqliteTable(
  'theme',
  {
    id: text('id').primaryKey(),
    manufacturerId: text('manufacturer_id')
      .notNull()
      .references(() => manufacturer.id, { onDelete: 'cascade' }),
    parentThemeId: text('parent_theme_id').references((): AnyColumn => theme.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('theme_manufacturer_idx').on(t.manufacturerId),
    uniqueIndex('theme_unique_name').on(t.manufacturerId, t.name),
  ],
);

/**
 * A catalog entry. The set exists in the world, independent of whether we own
 * it - ownership is expressed by `collection_item`.
 */
export const set = sqliteTable(
  'set',
  {
    id: text('id').primaryKey(),
    manufacturerId: text('manufacturer_id')
      .notNull()
      .references(() => manufacturer.id, { onDelete: 'restrict' }),
    themeId: text('theme_id').references(() => theme.id, { onDelete: 'set null' }),
    /** Manufacturer's own number, e.g. "60398", "71427", "2-30500". */
    setNumber: text('set_number').notNull(),
    name: text('name').notNull(),
    year: integer('year'),
    pieceCount: integer('piece_count'),
    minifigCount: integer('minifig_count'),
    ean: text('ean'),
    ageRange: text('age_range'),
    /** Either an external URL the user entered ... */
    imageUrl: text('image_url'),
    /** ... or a locally stored file below FILES_DIR. */
    imagePath: text('image_path'),
    /** EUR in cents - SQLite has no decimal type and sums must stay exact. */
    retailPriceCents: integer('retail_price_cents'),
    externalIds: text('external_ids', { mode: 'json' }).$type<Record<string, string>>(),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    uniqueIndex('set_manufacturer_number_unique').on(t.manufacturerId, t.setNumber),
    index('set_name_idx').on(t.name),
    index('set_ean_idx').on(t.ean),
    index('set_theme_idx').on(t.themeId),
    index('set_year_idx').on(t.year),
  ],
);

export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const setTag = sqliteTable(
  'set_tag',
  {
    setId: text('set_id')
      .notNull()
      .references(() => set.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.setId, t.tagId] })],
);

export const instruction = sqliteTable(
  'instruction',
  {
    id: text('id').primaryKey(),
    setId: text('set_id')
      .notNull()
      .references(() => set.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['pdf_upload', 'external_url'] }).notNull(),
    /** Set when kind = pdf_upload. */
    filePath: text('file_path'),
    /** Set when kind = external_url. */
    url: text('url'),
    /** Free text label, e.g. "Buch 1 von 3". */
    label: text('label'),
    pageCount: integer('page_count'),
    fileSizeBytes: integer('file_size_bytes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('instruction_set_idx').on(t.setId),
    check(
      'instruction_source',
      sql`(${t.kind} = 'pdf_upload' AND ${t.filePath} IS NOT NULL AND ${t.url} IS NULL)
          OR (${t.kind} = 'external_url' AND ${t.url} IS NOT NULL AND ${t.filePath} IS NULL)`,
    ),
  ],
);
