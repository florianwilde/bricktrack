import fs from 'node:fs/promises';
import { NextResponse, type NextRequest } from 'next/server';
import { contentTypeFor, isPublicFilePath, resolveFilePath, UploadError } from '@/lib/uploads';
import { getSession } from '@/lib/session';

/**
 * Serves uploads from DATA_DIR/files.
 *
 * Set images stay public because the shared wishlist page needs them; photos
 * and instruction PDFs require a session.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const relativePath = segments.join('/');

  if (!isPublicFilePath(relativePath) && !(await getSession())) {
    return new NextResponse('Nicht angemeldet', { status: 401 });
  }

  let absolute: string;
  try {
    absolute = resolveFilePath(relativePath);
  } catch (error) {
    if (error instanceof UploadError) return new NextResponse('Ungültiger Pfad', { status: 400 });
    throw error;
  }

  try {
    const file = await fs.readFile(absolute);
    const stats = await fs.stat(absolute);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': contentTypeFor(relativePath),
        'Content-Length': String(stats.size),
        // Uploaded files never change under the same name, so they can be
        // cached hard - privately, since some of them need a session.
        'Cache-Control': isPublicFilePath(relativePath)
          ? 'public, max-age=31536000, immutable'
          : 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${encodeURIComponent(relativePath.split('/').pop() ?? 'datei')}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('Nicht gefunden', { status: 404 });
    }
    console.error('[files] Datei konnte nicht gelesen werden', relativePath, error);
    return new NextResponse('Fehler beim Lesen der Datei', { status: 500 });
  }
}
