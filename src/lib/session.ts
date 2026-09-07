import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { UserRole } from '@/db/types';
import { auth } from './auth';

/**
 * Reads the current session. Cached per request so several server components
 * on the same page share one lookup.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

function toSessionUser(user: { id: string; name: string; email: string; role?: unknown }): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'member',
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session ? toSessionUser(session.user) : null;
}

/** Guard for every page and server action behind the login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/anmelden');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/');
  return user;
}
