import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// A throwaway database for this file alone, so the round trip can delete
// everything without touching the development data.
const DATA_DIR = path.resolve(process.cwd(), 'data-test-export');
process.env.DATA_DIR = DATA_DIR;

fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DATA_DIR, 'db'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'files', 'images', 'sets'), { recursive: true });

{
  const sqlite = new Database(path.join(DATA_DIR, 'db', 'bricktrack.db'));
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  sqlite.close();
}

const { db } = await import('@/db');
const schema = await import('@/db/schema');
const { buildExportPayload, buildExportZip, importArchive, ImportError, buildCollectionCsv } =
  await import('@/lib/export');

const now = new Date('2026-09-07T10:00:00.000Z');
const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';

function seed() {
  db.insert(schema.user)
    .values([
      {
        id: USER_ID,
        name: 'Florian',
        email: 'florian@example.test',
        emailVerified: false,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: OTHER_USER_ID,
        name: 'Mama',
        email: 'mama@example.test',
        emailVerified: false,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      },
    ])
    .run();

  db.insert(schema.manufacturer)
    .values({ id: 'm-1', name: 'Lego', slug: 'lego', createdAt: now, updatedAt: now })
    .run();

  db.insert(schema.theme)
    .values({ id: 't-1', manufacturerId: 'm-1', name: 'City', createdAt: now, updatedAt: now })
    .run();

  db.insert(schema.set)
    .values({
      id: 's-1',
      manufacturerId: 'm-1',
      themeId: 't-1',
      setNumber: '60398',
      name: 'Familienhaus und Elektroauto',
      year: 2023,
      pieceCount: 462,
      retailPriceCents: 4999,
      imagePath: 'images/sets/s-1/bild.webp',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(schema.collectionItem)
    .values({
      id: 'c-1',
      setId: 's-1',
      status: 'built',
      completeness: 'missing_parts',
      acquiredPriceCents: 4500,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(schema.missingPart)
    .values({
      id: 'p-1',
      collectionItemId: 'c-1',
      partNumber: '3001',
      colorName: 'Rot',
      quantity: 2,
      resolved: false,
      createdAt: now,
    })
    .run();

  db.insert(schema.wishlist)
    .values({
      id: 'w-1',
      ownerUserId: OTHER_USER_ID,
      title: 'Weihnachten 2026',
      occasion: 'christmas',
      shareToken: 'geheimer-token-der-nicht-wandern-darf',
      isPublic: true,
      surpriseMode: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(schema.wishlistItem)
    .values({
      id: 'wi-1',
      wishlistId: 'w-1',
      setId: 's-1',
      priority: 1,
      sortOrder: 0,
      reservedByName: 'Tante Anne',
      reservedAt: now,
      reservationTokenHash: 'a'.repeat(64),
      createdAt: now,
    })
    .run();

  fs.mkdirSync(path.join(DATA_DIR, 'files', 'images', 'sets', 's-1'), { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, 'files', 'images', 'sets', 's-1', 'bild.webp'),
    Buffer.from([1, 2, 3, 4, 5]),
  );
}

function clearAll() {
  db.delete(schema.wishlistItem).run();
  db.delete(schema.wishlist).run();
  db.delete(schema.missingPart).run();
  db.delete(schema.collectionItem).run();
  db.delete(schema.set).run();
  db.delete(schema.theme).run();
  db.delete(schema.manufacturer).run();
  db.delete(schema.user).run();
}

beforeAll(() => {
  clearAll();
});

beforeEach(() => {
  clearAll();
  seed();
});

describe('Export', () => {
  it('nimmt Katalog, Sammlung und Wunschlisten mit', () => {
    const payload = buildExportPayload();

    expect(payload.app).toBe('bricktrack');
    expect(payload.data.manufacturers).toHaveLength(1);
    expect(payload.data.sets).toHaveLength(1);
    expect(payload.data.collectionItems).toHaveLength(1);
    expect(payload.data.missingParts).toHaveLength(1);
    expect(payload.data.wishlists).toHaveLength(1);
    expect(payload.data.wishlistItems).toHaveLength(1);
  });

  it('nimmt weder Teilen-Token noch Reservierungen mit', () => {
    const payload = buildExportPayload();
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain('geheimer-token-der-nicht-wandern-darf');
    expect(serialized).not.toContain('Tante Anne');
    expect(serialized).not.toContain('a'.repeat(64));
  });

  it('nimmt keine Konten mit', () => {
    const serialized = JSON.stringify(buildExportPayload());

    expect(serialized).not.toContain('florian@example.test');
    expect(serialized).not.toContain('mama@example.test');
  });

  it('packt die hochgeladenen Dateien ins Archiv', () => {
    const archive = buildExportZip();

    expect(archive.byteLength).toBeGreaterThan(0);
    // Der Dateiname steht im ZIP-Verzeichnis im Klartext.
    expect(Buffer.from(archive).toString('latin1')).toContain('files/images/sets/s-1/bild.webp');
  });
});

describe('Import', () => {
  it('stellt einen vollstaendigen Rundweg wieder her', () => {
    const archive = buildExportZip();
    clearAll();

    // Der importierende Admin muss existieren - die Konten reisen nicht mit.
    db.insert(schema.user)
      .values({
        id: USER_ID,
        name: 'Florian',
        email: 'florian@example.test',
        emailVerified: false,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const summary = importArchive(archive, USER_ID);

    expect(summary.sets).toBe(1);
    expect(summary.collectionItems).toBe(1);
    expect(summary.wishlists).toBe(1);
    expect(summary.files).toBeGreaterThan(0);

    const sets = db.select().from(schema.set).all();
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({
      setNumber: '60398',
      name: 'Familienhaus und Elektroauto',
      pieceCount: 462,
      retailPriceCents: 4999,
    });
    // Zeitstempel muessen als Date zurueckkommen, nicht als String.
    expect(sets[0]!.createdAt).toBeInstanceOf(Date);

    expect(db.select().from(schema.missingPart).all()).toHaveLength(1);
  });

  it('uebergibt die Wunschlisten dem importierenden Admin und teilt sie nicht', () => {
    const archive = buildExportZip();
    clearAll();
    db.insert(schema.user)
      .values({
        id: USER_ID,
        name: 'Florian',
        email: 'florian@example.test',
        emailVerified: false,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    importArchive(archive, USER_ID);

    const [list] = db.select().from(schema.wishlist).all();
    expect(list?.ownerUserId).toBe(USER_ID);
    expect(list?.isPublic).toBe(false);
    expect(list?.shareToken).not.toBe('geheimer-token-der-nicht-wandern-darf');
    expect(list?.shareToken.length).toBeGreaterThan(16);
  });

  it('ersetzt vorhandene Daten, statt sie zu vermischen', () => {
    const archive = buildExportZip();

    // Zweites Set, das im Archiv nicht vorkommt.
    db.insert(schema.set)
      .values({
        id: 's-2',
        manufacturerId: 'm-1',
        setNumber: '99999',
        name: 'Wird ersetzt',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    importArchive(archive, USER_ID);

    const numbers = db
      .select({ setNumber: schema.set.setNumber })
      .from(schema.set)
      .all()
      .map((row) => row.setNumber);
    expect(numbers).toEqual(['60398']);
  });

  it('lehnt ein fremdes Archiv ab, ohne etwas zu loeschen', () => {
    const before = db.select().from(schema.set).all().length;

    expect(() => importArchive(new Uint8Array([1, 2, 3]), USER_ID)).toThrow(ImportError);
    expect(db.select().from(schema.set).all()).toHaveLength(before);
  });
});

describe('CSV', () => {
  it('trennt mit Semikolon und beginnt mit einer BOM', () => {
    const csv = buildCollectionCsv([{ a: 'x', b: 1 }], [
      { key: 'a', label: 'Spalte A' },
      { key: 'b', label: 'Spalte B' },
    ]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Spalte A;Spalte B');
    expect(csv).toContain('x;1');
  });

  it('maskiert Semikolon, Anfuehrungszeichen und Zeilenumbrueche', () => {
    const csv = buildCollectionCsv(
      [{ note: 'a;b "c"\nd' }],
      [{ key: 'note', label: 'Notiz' }],
    );

    expect(csv).toContain('"a;b ""c""\nd"');
  });
});
