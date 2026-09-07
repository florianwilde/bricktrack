import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Tokens for the parts of the app that work without an account: the wishlist
 * share link and the reservation cancel link.
 *
 * 32 random bytes, base64url encoded. That is 256 bits of entropy - guessing
 * one is not a threat model, and the encoded form survives being pasted into
 * a chat message without escaping.
 */
export const TOKEN_BYTES = 32;

export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Reservation and invite tokens are stored as a hash, so a database dump does
 * not let anyone cancel someone else's reservation. The share token is stored
 * in plain text on purpose - the owner has to be able to see it again.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time comparison of two hex hashes. */
export function tokensMatch(token: string, expectedHash: string | null | undefined): boolean {
  if (!expectedHash) return false;

  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}
