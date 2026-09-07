import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Tables owned by better-auth.
 *
 * The drizzle adapter resolves models through the TypeScript property names
 * (`userId`, `expiresAt`, ...), so the column names below are free to follow
 * the snake_case convention used by the rest of the schema.
 */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  /** App specific: the first registered user becomes admin, everyone else member. */
  role: text('role', { enum: ['admin', 'member'] })
    .notNull()
    .default('member'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);

/** Credential provider only for now; `password` holds the hashed password. */
export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('account_user_idx').on(t.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

/** @better-auth/passkey - a user may register any number of passkeys. */
export const passkey = sqliteTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull().unique(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
    transports: text('transports'),
    aaguid: text('aaguid'),
    createdAt: integer('created_at', { mode: 'timestamp' }),
  },
  (t) => [index('passkey_user_idx').on(t.userId)],
);

/** Persistent rate limiting so restarts do not reset login throttling. */
export const rateLimit = sqliteTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: integer('last_request'),
});

/**
 * Self-built invitations: after the first user, registration is only possible
 * through a link an admin created. Used from phase 2 on.
 */
export const invite = sqliteTable('invite', {
  id: text('id').primaryKey(),
  /** SHA-256 of the link token - the plaintext only ever lives in the link. */
  tokenHash: text('token_hash').notNull().unique(),
  email: text('email'),
  role: text('role', { enum: ['admin', 'member'] })
    .notNull()
    .default('member'),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  usedByUserId: text('used_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
