import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { set } from './catalog';
import { collector } from './collector';

export const wishlist = sqliteTable(
  'wishlist',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /**
     * Whose list this is. Null means "not tied to one collector" - useful
     * while there is only one, and for a shared list.
     */
    collectorId: text('collector_id').references(() => collector.id, { onDelete: 'set null' }),
    /** e.g. "Weihnachten 2026". */
    title: text('title').notNull(),
    occasion: text('occasion', { enum: ['christmas', 'birthday', 'easter', 'other'] })
      .notNull()
      .default('other'),
    eventDate: integer('event_date', { mode: 'timestamp' }),
    /** 32 random bytes, base64url encoded - the only key to the public view. */
    shareToken: text('share_token').notNull().unique(),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
    /** When on, the owner sees "reserviert" but not by whom. */
    surpriseMode: integer('surprise_mode', { mode: 'boolean' }).notNull().default(false),
    /** Message shown to the gift givers, e.g. "Bitte keine Doppelungen". */
    note: text('note'),
    /** When the owner was last reminded - keeps a nag from becoming a flood. */
    lastReminderAt: integer('last_reminder_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('wishlist_owner_idx').on(t.ownerUserId)],
);

export const wishlistItem = sqliteTable(
  'wishlist_item',
  {
    id: text('id').primaryKey(),
    wishlistId: text('wishlist_id')
      .notNull()
      .references(() => wishlist.id, { onDelete: 'cascade' }),
    setId: text('set_id')
      .notNull()
      .references(() => set.id, { onDelete: 'cascade' }),
    /** 1 = highest, 3 = lowest. */
    priority: integer('priority').notNull().default(2),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
    reservedByName: text('reserved_by_name'),
    reservedAt: integer('reserved_at', { mode: 'timestamp' }),
    /** SHA-256 of the cancellation token; plaintext only lives in the link. */
    reservationTokenHash: text('reservation_token_hash'),
    /** Set once the set showed up in the collection. */
    fulfilledAt: integer('fulfilled_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    // Makes "skip duplicates" a database guarantee, not just a UI rule.
    uniqueIndex('wishlist_item_unique').on(t.wishlistId, t.setId),
    index('wishlist_item_list_idx').on(t.wishlistId, t.sortOrder),
    check('wishlist_item_priority', sql`${t.priority} BETWEEN 1 AND 3`),
  ],
);
