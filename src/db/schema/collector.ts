import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A collector - in practice: a child.
 *
 * The catalog is shared (a set exists once, no matter who owns it), while
 * ownership and wishlists belong to one collector. With a single collector the
 * whole concept stays invisible in the UI; it only appears once a second one
 * exists, so a one-child household never pays for the feature.
 */
export const collector = sqliteTable(
  'collector',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** For telling two collectors apart at a glance. */
    color: text('color', {
      enum: ['blue', 'green', 'amber', 'rose', 'violet', 'slate'],
    })
      .notNull()
      .default('blue'),
    birthday: integer('birthday', { mode: 'timestamp' }),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('collector_sort_idx').on(t.sortOrder, t.name)],
);
