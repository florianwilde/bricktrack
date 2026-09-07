import { describe, expect, it } from 'vitest';
import { createToken, hashToken, tokensMatch, TOKEN_BYTES } from '@/lib/tokens';

describe('Token-Erzeugung', () => {
  it('erzeugt 32 Byte Zufall als base64url', () => {
    const token = createToken();

    expect(TOKEN_BYTES).toBe(32);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    // base64url darf nicht in URLs escaped werden muessen.
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('erzeugt bei jedem Aufruf einen anderen Token', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => createToken()));
    expect(tokens.size).toBe(500);
  });
});

describe('Token-Hashing', () => {
  it('liefert einen stabilen SHA-256-Hex-Hash', () => {
    const hash = hashToken('beispiel');

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hashToken('beispiel')).toBe(hash);
  });

  it('speichert den Klartext nirgends im Hash', () => {
    expect(hashToken('geheim')).not.toContain('geheim');
  });

  it('erkennt den passenden Token', () => {
    const token = createToken();
    expect(tokensMatch(token, hashToken(token))).toBe(true);
  });

  it('weist einen falschen Token ab', () => {
    expect(tokensMatch(createToken(), hashToken(createToken()))).toBe(false);
  });

  it('weist einen fehlenden Hash ab, statt zu vertrauen', () => {
    const token = createToken();
    expect(tokensMatch(token, null)).toBe(false);
    expect(tokensMatch(token, undefined)).toBe(false);
    expect(tokensMatch(token, '')).toBe(false);
  });

  it('weist einen Hash falscher Laenge ab, ohne zu werfen', () => {
    expect(tokensMatch(createToken(), 'abc')).toBe(false);
  });
});
