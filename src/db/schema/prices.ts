import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { set } from './catalog';

/**
 * An observed price for a set at a point in time.
 *
 * Kept as a series rather than a single field, because the interesting
 * question is not "what does it cost" but "what has it done since we bought
 * it". Entries are maintained by hand - the UVP from the set itself is the
 * starting point, everything after that is what you actually saw somewhere.
 */
export const pricePoint = sqliteTable(
  'price_point',
  {
    id: text('id').primaryKey(),
    setId: text('set_id')
      .notNull()
      .references(() => set.id, { onDelete: 'cascade' }),
    /** EUR in cents, like every other amount in this app. */
    priceCents: integer('price_cents').notNull(),
    condition: text('condition', { enum: ['new', 'used'] })
      .notNull()
      .default('new'),
    /** Where the price was seen, e.g. "Amazon", "Flohmarkt", "BrickLink". */
    source: text('source'),
    observedAt: integer('observed_at', { mode: 'timestamp' }).notNull(),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('price_point_set_idx').on(t.setId, t.observedAt),
    check('price_point_positive', sql`${t.priceCents} >= 0`),
  ],
);
