import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { env } from '@/env';

/**
 * Everything that writes into DATA_DIR/files.
 *
 * Rules that hold for every upload:
 *  - the file name is generated here, never taken from the client;
 *  - the type is verified by magic bytes, not by the declared MIME type;
 *  - the resulting path is checked to stay inside FILES_DIR.
 */

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PDF_MIME_TYPE = 'application/pdf';

export type UploadKind = 'set-image' | 'photo' | 'instruction';

export class UploadError extends Error {}

type Signature = { mime: string; test: (bytes: Uint8Array) => boolean };

const SIGNATURES: Signature[] = [
  {
    mime: 'application/pdf',
    test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    mime: 'image/jpeg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d &&
      b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/** Reads the real type from the first bytes. Returns null for anything else. */
export function detectMimeType(bytes: Uint8Array): string | null {
  return SIGNATURES.find((signature) => signature.test(bytes))?.mime ?? null;
}

function assertSize(file: File) {
  if (file.size === 0) throw new UploadError('Die Datei ist leer.');
  if (file.size > env.MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Die Datei ist größer als ${env.MAX_UPLOAD_MB} MB. Größere Dateien sind nicht erlaubt.`,
    );
  }
}

/** Absolute path for a path stored in the database, with traversal check. */
export function resolveFilePath(relativePath: string): string {
  const absolute = path.resolve(env.FILES_DIR, relativePath);
  const root = path.resolve(env.FILES_DIR);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new UploadError('Ungültiger Dateipfad.');
  }
  return absolute;
}

async function writeFile(relativePath: string, data: Buffer): Promise<void> {
  const absolute = resolveFilePath(relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, data);
}

export type StoredImage = {
  /** Path relative to FILES_DIR, as stored in the database. */
  filePath: string;
  thumbnailPath: string;
};

/**
 * Normalises an uploaded image to WebP plus a thumbnail. Large photos from a
 * phone camera shrink from several MB to a few hundred KB, which matters on a
 * self-hosted box with a small disk.
 */
export async function storeImage(file: File, kind: UploadKind, ownerId: string): Promise<StoredImage> {
  assertSize(file);
  return storeImageBytes(Buffer.from(await file.arrayBuffer()), kind, ownerId);
}

/**
 * Same as `storeImage`, but for bytes we already hold - for instance an image
 * the server fetched from an import source. The size limit still applies.
 */
export async function storeImageBytes(
  bytes: Buffer,
  kind: UploadKind,
  ownerId: string,
): Promise<StoredImage> {
  if (bytes.byteLength === 0) throw new UploadError('Die Datei ist leer.');
  if (bytes.byteLength > env.MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Das Bild ist größer als ${env.MAX_UPLOAD_MB} MB und wurde nicht übernommen.`,
    );
  }

  const mime = detectMimeType(bytes);
  if (!mime || !IMAGE_MIME_TYPES.includes(mime as (typeof IMAGE_MIME_TYPES)[number])) {
    throw new UploadError('Erlaubt sind nur JPEG-, PNG- und WebP-Bilder.');
  }

  const id = crypto.randomUUID();
  const folder = kind === 'set-image' ? `images/sets/${ownerId}` : `photos/${ownerId}`;
  const filePath = `${folder}/${id}.webp`;
  const thumbnailPath = `${folder}/${id}.thumb.webp`;

  const [full, thumbnail] = await Promise.all([
    sharp(bytes).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    sharp(bytes).rotate().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toBuffer(),
  ]);

  await writeFile(filePath, full);
  await writeFile(thumbnailPath, thumbnail);

  return { filePath, thumbnailPath };
}

export type StoredPdf = {
  filePath: string;
  fileSizeBytes: number;
};

export async function storePdf(file: File, setId: string): Promise<StoredPdf> {
  assertSize(file);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (detectMimeType(bytes) !== PDF_MIME_TYPE) {
    throw new UploadError('Anleitungen müssen PDF-Dateien sein.');
  }

  const filePath = `instructions/${setId}/${crypto.randomUUID()}.pdf`;
  await writeFile(filePath, bytes);

  return { filePath, fileSizeBytes: bytes.byteLength };
}

/** Removes a stored file. Missing files are not an error - the row is going away anyway. */
export async function deleteStoredFile(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  try {
    await fs.unlink(resolveFilePath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[uploads] Datei konnte nicht gelöscht werden', relativePath, error);
    }
  }
}

/** Files below images/ are readable without a session (see CLAUDE.md). */
export function isPublicFilePath(relativePath: string): boolean {
  return relativePath.startsWith('images/');
}

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

export function contentTypeFor(relativePath: string): string {
  return CONTENT_TYPES[path.extname(relativePath).toLowerCase()] ?? 'application/octet-stream';
}
