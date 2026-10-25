import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Encrypts secrets that settings must keep, such as the SMTP password.
 *
 * AES-256-GCM with a key derived from BETTER_AUTH_SECRET: a copy of the
 * database alone does not reveal the password. Changing BETTER_AUTH_SECRET
 * makes stored secrets unreadable - `openSecret` then returns null and the
 * password has to be entered again. Pure apart from node:crypto, so tested.
 */

const VERSION = 'v1';

function deriveKey(masterSecret: string): Buffer {
  return Buffer.from(hkdfSync('sha256', masterSecret, 'bricktrack', 'app-setting-secret', 32));
}

export function sealSecret(plain: string, masterSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(masterSecret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function openSecret(sealed: string, masterSecret: string): string | null {
  const [version, iv, tag, encrypted] = sealed.split(':');
  if (version !== VERSION || !iv || !tag || encrypted === undefined) return null;

  try {
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(masterSecret), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key or tampered value: treat as "no password stored".
    return null;
  }
}
