import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { and, desc, eq, isNull, gt } from 'drizzle-orm';
import { db } from '@/db';
import { invite, user } from '@/db/schema';
import type { UserRole } from '@/db/types';
import { createToken, hashToken } from './tokens';

/**
 * Invitations.
 *
 * After the first user, sign-up is closed. An admin issues a link; the
 * plaintext token only ever lives in that link, the database keeps its
 * SHA-256 hash.
 */

export type InviteGrant = { inviteId: string; role: UserRole };

/**
 * Marks the current call stack as "covered by a valid invitation".
 *
 * better-auth's user-create hook has no way of receiving extra arguments, and
 * the sign-up payload must not be trusted with a role. AsyncLocalStorage keeps
 * the grant tied to the one server action that verified the token - it can
 * neither leak into another request nor be forged from the client.
 */
const grantStorage = new AsyncLocalStorage<InviteGrant>();

export function withInviteGrant<T>(grant: InviteGrant, fn: () => Promise<T>): Promise<T> {
  return grantStorage.run(grant, fn);
}

export function currentInviteGrant(): InviteGrant | undefined {
  return grantStorage.getStore();
}

export const INVITE_VALID_DAYS = 14;

export function createInvite(input: {
  createdByUserId: string;
  email: string | null;
  role: UserRole;
  validDays?: number;
}): { id: string; token: string; expiresAt: Date } {
  const token = createToken();
  const expiresAt = new Date(
    Date.now() + (input.validDays ?? INVITE_VALID_DAYS) * 24 * 60 * 60 * 1000,
  );
  const id = crypto.randomUUID();

  db.insert(invite)
    .values({
      id,
      tokenHash: hashToken(token),
      email: input.email,
      role: input.role,
      createdByUserId: input.createdByUserId,
      expiresAt,
      createdAt: new Date(),
    })
    .run();

  return { id, token, expiresAt };
}

export type UsableInvite = {
  id: string;
  email: string | null;
  role: UserRole;
  expiresAt: Date;
};

/** Returns the invite behind a link token, or null if it cannot be used. */
export function findUsableInvite(token: string): UsableInvite | null {
  if (!token) return null;

  const row = db
    .select({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    })
    .from(invite)
    .where(
      and(
        eq(invite.tokenHash, hashToken(token)),
        isNull(invite.usedAt),
        gt(invite.expiresAt, new Date()),
      ),
    )
    .get();

  return row ?? null;
}

export function markInviteUsed(inviteId: string, userId: string): void {
  db.update(invite)
    .set({ usedAt: new Date(), usedByUserId: userId })
    .where(eq(invite.id, inviteId))
    .run();
}

export function deleteInvite(inviteId: string): void {
  db.delete(invite).where(eq(invite.id, inviteId)).run();
}

export type InviteRow = {
  id: string;
  email: string | null;
  role: UserRole;
  expiresAt: Date;
  usedAt: Date | null;
  usedByName: string | null;
  createdAt: Date;
};

export function listInvites(): InviteRow[] {
  return db
    .select({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      usedByName: user.name,
      createdAt: invite.createdAt,
    })
    .from(invite)
    .leftJoin(user, eq(user.id, invite.usedByUserId))
    .orderBy(desc(invite.createdAt))
    .all();
}

/** An invite is only interesting while it can still be used. */
export function inviteState(row: InviteRow): 'used' | 'expired' | 'open' {
  if (row.usedAt) return 'used';
  if (row.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'open';
}
