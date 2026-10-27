import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { ShoppingListLines } from '@/components/sammlung/shopping-list-lines';
import { Button } from '@/components/ui/button';
import { activeCollectorId } from '@/lib/collector-choice';
import { formatNumber, pluralize } from '@/lib/format';
import { listOpenMissingPartEntries } from '@/lib/queries/collection';
import { listCollectors } from '@/lib/queries/collectors';
import { requireUser } from '@/lib/session';
import { buildShoppingList } from '@/lib/shopping-list';

export const metadata: Metadata = { title: 'Fehlteile' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

/** Everything that is missing, as one list to take to a shop or to BrickLink. */
export default async function FehlteilePage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;

  const collectors = listCollectors();
  const collectorId = await activeCollectorId(single(params.sammler));
  const activeCollector = collectors.find((row) => row.id === collectorId) ?? null;
  const list = buildShoppingList(listOpenMissingPartEntries(collectorId));

  // Downloads follow the page: same collector, or explicitly everybody.
  const query = `?sammler=${collectorId ?? 'alle'}`;
  const empty = list.lines.length === 0 && list.withoutPartNumber.length === 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Link
          href="/sammlung"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Sammlung
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fehlteile</h1>
          <p className="text-sm text-muted-foreground">
            {activeCollector
              ? `Alles, was in den Sets von ${activeCollector.name} fehlt – zusammengefasst je Teil und Farbe.`
              : 'Alles, was in der Sammlung fehlt – zusammengefasst je Teil und Farbe.'}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Es fehlt nichts. Fehlteile vermerkst du auf der Seite eines Sets am Exemplar unter
          „Fehlteile“.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pluralize(list.lines.length, 'Teil', 'verschiedene Teile')},{' '}
            {formatNumber(list.totalPieces)} Stück
            {list.withoutPartNumber.length > 0
              ? ` · ${formatNumber(list.withoutPartNumber.length)} ohne Teilenummer`
              : ''}
          </p>

          {list.lines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={`/api/missing-parts/xml${query}`} download>
                  <Download />
                  BrickLink-Wunschliste
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={`/api/missing-parts/csv${query}`} download>
                  <Download />
                  Als CSV
                </a>
              </Button>
            </div>
          ) : null}
          {list.lines.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Die Wunschliste lädst du auf BrickLink unter „Wanted → Upload“ hoch. Abhaken, sobald
              ein Teil da ist – es gilt dann in allen Sets als erledigt.
            </p>
          ) : null}

          <ShoppingListLines lines={list.lines} withoutPartNumber={list.withoutPartNumber} />
        </>
      )}
    </div>
  );
}
