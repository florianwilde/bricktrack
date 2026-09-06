import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { count } from 'drizzle-orm';
import { db, schema } from '@/db';
import { env } from '@/env';

/**
 * Returns true while the instance has no user at all.
 *
 * The very first registration creates the admin; afterwards sign-up is closed
 * and only works through an invitation (phase 2).
 */
export function isFirstRun(): boolean {
  const [row] = db.select({ value: count() }).from(schema.user).all();
  return (row?.value ?? 0) === 0;
}

export const auth = betterAuth({
  appName: 'Bricktrack',
  baseURL: env.BASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      passkey: schema.passkey,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // No mail server in this deployment, so verification links would go nowhere.
    requireEmailVerification: false,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'member',
        // Never settable through the sign-up payload - only by our own hook.
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  trustedOrigins: [env.BASE_URL],
  advanced: {
    cookiePrefix: 'bricktrack',
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
    },
    // TLS is terminated by the reverse proxy, so the client IP arrives in a header.
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
    },
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  rateLimit: {
    enabled: true,
    // Survives container restarts, unlike the default in-memory storage.
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 300, max: 3 },
      '/passkey/generate-authenticate-options': { window: 60, max: 10 },
      '/passkey/verify-authentication': { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const firstRun = isFirstRun();
          if (!firstRun) {
            // Phase 2 opens this up again for invited users.
            throw new APIError('FORBIDDEN', {
              message:
                'Die Registrierung ist geschlossen. Bitte lass dir vom Administrator einen Einladungslink schicken.',
            });
          }
          return { data: { ...user, role: 'admin' as const } };
        },
      },
    },
  },
  plugins: [
    passkey({
      rpID: env.RP_ID,
      rpName: env.RP_NAME,
      origin: env.BASE_URL,
      authenticatorSelection: {
        // Discoverable credentials enable the passwordless autofill flow.
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    }),
    // Must stay last: lets server actions write the session cookie.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
