import { NextResponse } from 'next/server';
import {
  buildCollectionCsv,
  buildExportPayload,
  buildExportZip,
  exportFileName,
} from '@/lib/export';
import { formatDate } from '@/lib/format';
import { conditionLabel, completenessLabel, statusLabel } from '@/lib/labels';
import { centsToInput } from '@/lib/money';
import { listCollectionItems } from '@/lib/queries/collection';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const CSV_COLUMNS = [
  { key: 'setNumber', label: 'Setnummer' },
  { key: 'setName', label: 'Name' },
  { key: 'manufacturer', label: 'Hersteller' },
  { key: 'theme', label: 'Thema' },
  { key: 'year', label: 'Jahr' },
  { key: 'pieceCount', label: 'Teile' },
  { key: 'status', label: 'Status' },
  { key: 'completeness', label: 'Vollständigkeit' },
  { key: 'condition', label: 'Zustand' },
  { key: 'location', label: 'Standort' },
  { key: 'acquiredAt', label: 'Im Besitz seit' },
  { key: 'acquiredPrice', label: 'Kaufpreis (EUR)' },
  { key: 'retailPrice', label: 'UVP (EUR)' },
  { key: 'acquiredFrom', label: 'Gekauft bei' },
  { key: 'giftedBy', label: 'Geschenkt von' },
  { key: 'notes', label: 'Notizen' },
];

/**
 * Downloads.
 *
 * The full archive is for admins - it contains the whole collection. The CSV
 * of the collection is available to every signed-in member.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Nicht angemeldet', { status: 401 });

  const { kind } = await context.params;

  if (kind === 'csv') {
    const rows = listCollectionItems({}).map((item) => ({
      setNumber: item.setNumber,
      setName: item.setName,
      manufacturer: item.manufacturerName,
      theme: item.themeName,
      year: item.year,
      pieceCount: item.pieceCount,
      status: statusLabel(item.status),
      completeness: completenessLabel(item.completeness),
      condition: conditionLabel(item.condition),
      location: item.locationName,
      acquiredAt: item.acquiredAt ? formatDate(item.acquiredAt) : '',
      acquiredPrice: centsToInput(item.acquiredPriceCents),
      retailPrice: centsToInput(item.retailPriceCents),
      acquiredFrom: item.acquiredFrom,
      giftedBy: item.giftedBy,
      notes: item.notes,
    }));

    return new NextResponse(buildCollectionCsv(rows, CSV_COLUMNS), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName('csv')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (user.role !== 'admin') {
    return new NextResponse('Nur Administratoren dürfen die Daten exportieren', { status: 403 });
  }

  if (kind === 'json') {
    return new NextResponse(JSON.stringify(buildExportPayload(), null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFileName('json')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (kind === 'zip') {
    const archive = buildExportZip();
    return new NextResponse(archive as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(archive.byteLength),
        'Content-Disposition': `attachment; filename="${exportFileName('zip')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse('Unbekanntes Format', { status: 404 });
}
