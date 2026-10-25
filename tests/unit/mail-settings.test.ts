import { describe, expect, it } from 'vitest';
import { openSecret, sealSecret } from '@/lib/secret-box';
import { mailSettingsSchema } from '@/lib/validation';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';

describe('Passwort verschluesselt speichern', () => {
  it('kommt mit demselben Schluessel unveraendert zurueck', () => {
    const sealed = sealSecret('geheim mit Leerzeichen ', SECRET);
    expect(sealed).not.toContain('geheim');
    expect(openSecret(sealed, SECRET)).toBe('geheim mit Leerzeichen ');
  });

  it('verschluesselt dasselbe Passwort jedes Mal anders', () => {
    expect(sealSecret('x', SECRET)).not.toBe(sealSecret('x', SECRET));
  });

  it('liefert nichts bei anderem Schluessel oder veraendertem Wert', () => {
    const sealed = sealSecret('geheim', SECRET);
    expect(openSecret(sealed, 'ein-anderes-secret-0123456789-abcdefgh')).toBeNull();

    const [version, iv, tag, data] = sealed.split(':');
    const flipped = Buffer.from(data!, 'base64');
    flipped[0] = flipped[0]! ^ 0xff;
    expect(openSecret([version, iv, tag, flipped.toString('base64')].join(':'), SECRET)).toBeNull();
    expect(openSecret('kaputt', SECRET)).toBeNull();
  });
});

describe('SMTP-Eingaben pruefen', () => {
  const valid = {
    host: 'mail.example.de',
    port: '587',
    security: 'starttls',
    user: 'bricktrack@example.de',
    password: '  mit Rand  ',
    from: 'Bricktrack <bricktrack@example.de>',
  };

  it('nimmt gueltige Angaben und laesst das Passwort, wie es ist', () => {
    const parsed = mailSettingsSchema.parse(valid);
    expect(parsed.port).toBe(587);
    expect(parsed.password).toBe('  mit Rand  ');
    expect(parsed.clearPassword).toBe(false);
  });

  it('macht aus einem leeren Passwort "unveraendert"', () => {
    expect(mailSettingsSchema.parse({ ...valid, password: '' }).password).toBeNull();
  });

  it('lehnt URLs, Ports und Absender ohne Adresse ab', () => {
    expect(mailSettingsSchema.safeParse({ ...valid, host: 'https://mail.example.de' }).success).toBe(false);
    expect(mailSettingsSchema.safeParse({ ...valid, host: 'mail.example.de:587' }).success).toBe(false);
    expect(mailSettingsSchema.safeParse({ ...valid, port: '70000' }).success).toBe(false);
    expect(mailSettingsSchema.safeParse({ ...valid, from: 'Bricktrack' }).success).toBe(false);
    expect(mailSettingsSchema.safeParse({ ...valid, security: 'ssl3' }).success).toBe(false);
  });
});
