import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server actions call these; neither has anything to do outside a request.
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/session', () => ({ requireUser: async () => ({ id: 'user-1' }) }));

// A throwaway database for this file alone.
const DATA_DIR = path.resolve(process.cwd(), 'data-test-photos');
process.env.DATA_DIR = DATA_DIR;

fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DATA_DIR, 'db'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'files'), { recursive: true });

{
  const sqlite = new Database(path.join(DATA_DIR, 'db', 'bricktrack.db'));
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  sqlite.close();
}

const { db } = await import('@/db');
const schema = await import('@/db/schema');
const { addCollectionItemPhoto, addSetPhoto, deleteSet } = await import('@/app/(app)/katalog/actions');
const { deleteCollectionItem } = await import('@/app/(app)/sammlung/actions');
const { listPhotosForCollectionItems, listPhotosForSet } = await import('@/lib/queries/catalog');

const now = new Date('2026-10-27T10:00:00.000Z');

function seed() {
  db.delete(schema.set).run();
  db.delete(schema.manufacturer).run();
  db.insert(schema.manufacturer)
    .values({ id: 'm-1', name: 'Lego', slug: 'lego', createdAt: now, updatedAt: now })
    .run();
  db.insert(schema.set)
    .values({
      id: 's-1',
      manufacturerId: 'm-1',
      setNumber: '60398',
      name: 'Familienhaus und Elektroauto',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(schema.collectionItem)
    .values([
      { id: 'c-1', setId: 's-1', status: 'built', completeness: 'complete', createdAt: now, updatedAt: now },
      { id: 'c-2', setId: 's-1', status: 'owned', completeness: 'complete', createdAt: now, updatedAt: now },
    ])
    .run();
}

async function upload(caption?: string) {
  const png = await sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 214, g: 58, b: 48 } },
  })
    .png()
    .toBuffer();
  const formData = new FormData();
  formData.set('file', new File([new Uint8Array(png)], 'handy.png', { type: 'image/png' }));
  if (caption) formData.set('caption', caption);
  return formData;
}

const stored = (relative: string | null) =>
  relative !== null && fs.existsSync(path.join(DATA_DIR, 'files', relative));

describe('Fotos je Sammlungseintrag', () => {
  beforeEach(seed);

  it('speichert ein Foto am Exemplar, nicht am Set', async () => {
    const result = await addCollectionItemPhoto('c-1', await upload('Box mit Knick'));
    expect(result.ok).toBe(true);

    const photos = listPhotosForCollectionItems(['c-1', 'c-2']);
    expect(photos.get('c-1')).toHaveLength(1);
    expect(photos.get('c-1')?.[0]?.caption).toBe('Box mit Knick');
    expect(photos.has('c-2')).toBe(false);
    expect(listPhotosForSet('s-1')).toHaveLength(0);

    const [photo] = photos.get('c-1') ?? [];
    expect(photo?.filePath).toMatch(/^photos\/c-1\//);
    expect(stored(photo?.filePath ?? null)).toBe(true);
    expect(stored(photo?.thumbnailPath ?? null)).toBe(true);
  });

  it('lehnt einen Eintrag ab, den es nicht gibt', async () => {
    const result = await addCollectionItemPhoto('gibt-es-nicht', await upload());
    expect(result.ok).toBe(false);
  });

  it('löscht beim Entfernen des Exemplars auch dessen Dateien', async () => {
    await addCollectionItemPhoto('c-1', await upload());
    await addCollectionItemPhoto('c-2', await upload());
    const [mine] = listPhotosForCollectionItems(['c-1']).get('c-1') ?? [];
    const [other] = listPhotosForCollectionItems(['c-2']).get('c-2') ?? [];

    await deleteCollectionItem('c-1');

    expect(stored(mine?.filePath ?? null)).toBe(false);
    expect(stored(mine?.thumbnailPath ?? null)).toBe(false);
    expect(listPhotosForCollectionItems(['c-1']).size).toBe(0);
    expect(stored(other?.filePath ?? null)).toBe(true);
  });

  it('löscht beim Entfernen des Sets die Fotos von Set und Exemplaren', async () => {
    await addSetPhoto('s-1', await upload());
    await addCollectionItemPhoto('c-2', await upload());
    const files = db
      .select()
      .from(schema.photo)
      .all()
      .flatMap((row) => [row.filePath, row.thumbnailPath]);
    expect(files.every(stored)).toBe(true);

    await deleteSet('s-1');

    expect(files.some(stored)).toBe(false);
    expect(db.select().from(schema.photo).all()).toHaveLength(0);
  });
});
