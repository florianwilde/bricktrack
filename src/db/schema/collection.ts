import { sql, type AnyColumn } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { set } from './catalog';

export const location = sqliteTable('location', {
  id: text('id').primaryKey(),
  /** e.g. "Regal Kinderzimmer", "Kiste Keller 3". */
  name: text('name').notNull(),
  parentLocationId: text('parent_location_id').references((): AnyColumn => location.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Ownership: links a catalog set to a copy we actually have. Owning the same
 * set twice means two rows.
 */
export const collectionItem = sqliteTable(
  'collection_item',
  {
    id: text('id').primaryKey(),
    setId: text('set_id')
      .notNull()
      .references(() => set.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['owned', 'built', 'disassembled', 'lent_out', 'sold'],
    })
      .notNull()
      .default('owned'),
    completeness: text('completeness', { enum: ['complete', 'missing_parts', 'unknown'] })
      .notNull()
      .default('unknown'),
    condition: text('condition', {
      enum: ['new_sealed', 'like_new', 'good', 'used', 'damaged'],
    }),
    locationId: text('location_id').references(() => location.id, { onDelete: 'set null' }),
    acquiredAt: integer('acquired_at', { mode: 'timestamp' }),
    acquiredPriceCents: integer('acquired_price_cents'),
    acquiredFrom: text('acquired_from'),
    giftedBy: text('gifted_by'),
    lentOutTo: text('lent_out_to'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('collection_item_set_idx').on(t.setId),
    index('collection_item_status_idx').on(t.status),
    index('collection_item_location_idx').on(t.locationId),
  ],
);

export const missingPart = sqliteTable(
  'missing_part',
  {
    id: text('id').primaryKey(),
    collectionItemId: text('collection_item_id')
      .notNull()
      .references(() => collectionItem.id, { onDelete: 'cascade' }),
    partNumber: text('part_number'),
    colorName: text('color_name'),
    quantity: integer('quantity').notNull().default(1),
    resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('missing_part_item_idx').on(t.collectionItemId)],
);

/** Belongs to either a catalog set or one owned copy - never to both. */
export const photo = sqliteTable(
  'photo',
  {
    id: text('id').primaryKey(),
    setId: text('set_id').references(() => set.id, { onDelete: 'cascade' }),
    collectionItemId: text('collection_item_id').references(() => collectionItem.id, {
      onDelete: 'cascade',
    }),
    filePath: text('file_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    caption: text('caption'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('photo_set_idx').on(t.setId),
    index('photo_item_idx').on(t.collectionItemId),
    check(
      'photo_single_owner',
      sql`(${t.setId} IS NOT NULL) <> (${t.collectionItemId} IS NOT NULL)`,
    ),
  ],
);
