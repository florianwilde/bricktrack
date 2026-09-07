import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { env } from '@/env';
import { formatDate } from './format';

/**
 * Export and import of the whole collection.
 *
 * What this is: a portable copy of the data - to move to another machine, to
 * look at outside the app, or as a second safety net.
 *
 * What this is not: a replacement for backing up ./data. Accounts, passwords
 * and passkeys are deliberately left out, because a JSON file full of password
 * hashes in someone's download folder is a liability, not a backup.
 */

export const EXPORT_FORMAT_VERSION = 1;

export type ExportPayload = {
  formatVersion: number;
  exportedAt: string;
  app: string;
  data: {
    manufacturers: unknown[];
    themes: unknown[];
    sets: unknown[];
    tags: unknown[];
    setTags: unknown[];
    instructions: unknown[];
    locations: unknown[];
    collectionItems: unknown[];
    missingParts: unknown[];
    photos: unknown[];
    wishlists: unknown[];
    wishlistItems: unknown[];
  };
};

/** Everything except accounts and sessions. */
export function buildExportPayload(): ExportPayload {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'bricktrack',
    data: {
      manufacturers: db.select().from(schema.manufacturer).all(),
      themes: db.select().from(schema.theme).all(),
      sets: db.select().from(schema.set).all(),
      tags: db.select().from(schema.tag).all(),
      setTags: db.select().from(schema.setTag).all(),
      instructions: db.select().from(schema.instruction).all(),
      locations: db.select().from(schema.location).all(),
      collectionItems: db.select().from(schema.collectionItem).all(),
      missingParts: db.select().from(schema.missingPart).all(),
      photos: db.select().from(schema.photo).all(),
      // Reservations are personal data of people without an account and have
      // no meaning outside the running instance - so they stay behind.
      wishlists: db
        .select()
        .from(schema.wishlist)
        .all()
        .map(({ shareToken, ...rest }) => ({ ...rest, shareToken: null })),
      wishlistItems: db
        .select()
        .from(schema.wishlistItem)
        .all()
        .map(({ reservationTokenHash, reservedByName, reservedAt, ...rest }) => rest),
    },
  };
}

/** Collects every uploaded file, keyed by its path relative to FILES_DIR. */
function collectFiles(): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const root = env.FILES_DIR;
  if (!fs.existsSync(root)) return files;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      files[`files/${relative}`] = new Uint8Array(fs.readFileSync(absolute));
    }
  };

  walk(root);
  return files;
}

/** One archive with the data and every uploaded file. */
export function buildExportZip(): Uint8Array {
  const payload = buildExportPayload();

  return zipSync(
    {
      'bricktrack.json': strToU8(JSON.stringify(payload, null, 2)),
      ...collectFiles(),
    },
    // Level 6 is the sweet spot: JPEGs and PDFs barely compress anyway.
    { level: 6 },
  );
}

export function exportFileName(extension: string): string {
  const today = formatDate(new Date()).split('.').reverse().join('-');
  return `bricktrack-${today}.${extension}`;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The collection as CSV, semicolon separated with a BOM - that is what German
 * Excel opens without asking questions.
 */
export function buildCollectionCsv(
  rows: Array<Record<string, string | number | null>>,
  columns: Array<{ key: string; label: string }>,
): string {
  const lines = [columns.map((column) => csvCell(column.label)).join(';')];

  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column.key])).join(';'));
  }

  return `﻿${lines.join('\r\n')}\r\n`;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export class ImportError extends Error {}

export type ImportSummary = {
  sets: number;
  collectionItems: number;
  wishlists: number;
  files: number;
};

type ArchiveContents = {
  payload: ExportPayload;
  files: Record<string, Uint8Array>;
};

function readArchive(bytes: Uint8Array): ArchiveContents {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new ImportError('Die Datei ist kein gültiges Bricktrack-Archiv (ZIP erwartet).');
  }

  const json = entries['bricktrack.json'];
  if (!json) {
    throw new ImportError('Im Archiv fehlt bricktrack.json. Stammt es wirklich aus Bricktrack?');
  }

  let payload: ExportPayload;
  try {
    payload = JSON.parse(strFromU8(json)) as ExportPayload;
  } catch {
    throw new ImportError('bricktrack.json lässt sich nicht lesen.');
  }

  if (payload.app !== 'bricktrack' || typeof payload.data !== 'object') {
    throw new ImportError('Das Archiv stammt nicht aus Bricktrack.');
  }
  if (payload.formatVersion > EXPORT_FORMAT_VERSION) {
    throw new ImportError(
      `Das Archiv wurde mit einer neueren Version erstellt (Format ${payload.formatVersion}). Bitte zuerst Bricktrack aktualisieren.`,
    );
  }

  const files: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(entries)) {
    if (name.startsWith('files/') && !name.endsWith('/')) {
      files[name.slice('files/'.length)] = content;
    }
  }

  return { payload, files };
}

/** Guards against a path escaping FILES_DIR through the archive. */
function safeTarget(relative: string): string | null {
  const absolute = path.resolve(env.FILES_DIR, relative);
  const root = path.resolve(env.FILES_DIR);
  return absolute.startsWith(root + path.sep) ? absolute : null;
}

/**
 * Replaces all application data with the contents of the archive.
 *
 * Deliberately a replacement and not a merge: merging two collections would
 * need conflict rules for every table, and the result would be impossible to
 * predict. Wishlists are handed to the importing admin, since the original
 * owner's account does not travel with the archive.
 */
export function importArchive(bytes: Uint8Array, ownerUserId: string): ImportSummary {
  const { payload, files } = readArchive(bytes);
  const data = payload.data;

  db.transaction((tx) => {
    // Order matters only for readability - the foreign keys cascade anyway.
    tx.delete(schema.wishlistItem).run();
    tx.delete(schema.wishlist).run();
    tx.delete(schema.missingPart).run();
    tx.delete(schema.photo).run();
    tx.delete(schema.instruction).run();
    tx.delete(schema.collectionItem).run();
    tx.delete(schema.setTag).run();
    tx.delete(schema.set).run();
    tx.delete(schema.tag).run();
    tx.delete(schema.theme).run();
    tx.delete(schema.manufacturer).run();
    tx.delete(schema.location).run();

    const insertAll = (table: never, rows: unknown[]) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      // Insert in batches: SQLite caps the number of bound variables.
      for (let index = 0; index < rows.length; index += 100) {
        tx.insert(table)
          .values(rows.slice(index, index + 100) as never)
          .run();
      }
    };

    insertAll(schema.manufacturer as never, revive(data.manufacturers));
    insertAll(schema.location as never, revive(data.locations));
    insertAll(schema.theme as never, revive(data.themes));
    insertAll(schema.set as never, revive(data.sets));
    insertAll(schema.tag as never, revive(data.tags));
    insertAll(schema.setTag as never, revive(data.setTags));
    insertAll(schema.instruction as never, revive(data.instructions));
    insertAll(schema.collectionItem as never, revive(data.collectionItems));
    insertAll(schema.missingPart as never, revive(data.missingParts));
    insertAll(schema.photo as never, revive(data.photos));

    const wishlists = revive(data.wishlists).map((row) => ({
      ...(row as Record<string, unknown>),
      ownerUserId,
      // Fresh tokens: links from the exporting instance must not resurrect.
      shareToken: crypto.randomUUID().replace(/-/g, ''),
      isPublic: false,
    }));
    insertAll(schema.wishlist as never, wishlists);
    insertAll(schema.wishlistItem as never, revive(data.wishlistItems));
  });

  let restored = 0;
  for (const [relative, content] of Object.entries(files)) {
    const target = safeTarget(relative);
    if (!target) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    restored += 1;
  }

  return {
    sets: data.sets?.length ?? 0,
    collectionItems: data.collectionItems?.length ?? 0,
    wishlists: data.wishlists?.length ?? 0,
    files: restored,
  };
}

/**
 * JSON has no date type, so timestamps come back as strings. Drizzle expects
 * Date objects for its timestamp columns.
 */
function revive(rows: unknown[]): unknown[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    if (typeof row !== 'object' || row === null) return row;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      const looksLikeDate =
        typeof value === 'string' &&
        /(At|Date)$/.test(key) &&
        /^\d{4}-\d{2}-\d{2}T/.test(value);
      result[key] = looksLikeDate ? new Date(value) : value;
    }
    return result;
  });
}
