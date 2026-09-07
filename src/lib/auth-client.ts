'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side auth client. The base URL stays relative so the app works
 * behind any reverse proxy without rebuilding.
 */
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
