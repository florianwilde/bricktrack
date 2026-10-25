import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Settings made in the app rather than in the .env - for now the SMTP server
 * for reminders. One row per topic, the value as JSON.
 *
 * Never part of the export: it may hold credentials (the SMTP password is
 * stored encrypted, see src/lib/secret-box.ts).
 */
export const appSetting = sqliteTable('app_setting', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
