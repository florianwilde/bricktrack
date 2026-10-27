import { NextResponse, type NextRequest } from 'next/server';
import { activeCollectorId } from '@/lib/collector-choice';
import { buildCollectionCsv } from '@/lib/export';
import { formatDate } from '@/lib/format';
import { listOpenMissingPartEntries } from '@/lib/queries/collection';
import { getCurrentUser } from '@/lib/session';
import {
  buildShoppingList,
  buildWantedListXml,
  SHOPPING_CSV_COLUMNS,
  shoppingCsvRows,
} from '@/lib/shopping-list';

export const dynamic = 'force-dynamic';

function fileName(extension: string): string {
  const today = formatDate(new Date()).split('.').reverse().join('-');
  return `bricktrack-fehlteile-${today}.${extension}`;
}

/**
 * The shopping list for missing parts as a download: CSV for a spreadsheet,
 * XML for BrickLink's "Wanted → Upload". Same collector as the page.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ format: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Nicht angemeldet', { status: 401 });

  const { format } = await context.params;
  const collectorId = await activeCollectorId(request.nextUrl.searchParams.get('sammler') ?? undefined);
  const list = buildShoppingList(listOpenMissingPartEntries(collectorId));

  if (format === 'csv') {
    return new NextResponse(buildCollectionCsv(shoppingCsvRows(list.lines), SHOPPING_CSV_COLUMNS), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName('csv')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (format === 'xml') {
    return new NextResponse(buildWantedListXml(list.lines), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName('xml')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return new NextResponse('Unbekanntes Format', { status: 404 });
}
