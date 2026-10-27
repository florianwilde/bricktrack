import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Gift } from 'lucide-react';
import { cn } from 'cn';
import { Card, CardContent } from '@/components/ui/card';
import { activeCollectorId } from '@/lib/collector-choice';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { formatEuro } from '@/lib/money';
import { listTimelineItems } from '@/lib/queries/collection';
import { listCollectors } from '@/lib/queries/collectors';
import { requireUser } from '@/lib/session';
import {
  buildTimeline,
  TIMELINE_MONTHS,
  timelineRows,
  type TimelineItem,
  type TimelineUnit,
} from '@/lib/timeline';

export const metadata: Metadata = { title: 'Verlauf' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

const VIEWS: Array<{ unit: TimelineUnit; param: string | null; label: string }> = [
  { unit: 'year', param: null, label: 'Nach Jahren' },
  { unit: 'month', param: 'monate', label: `Letzte ${TIMELINE_MONTHS} Monate` },
];

function SetList({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/katalog/${item.setId}`}
            className="flex items-baseline gap-3 py-2 text-sm hover:underline"
          >
            <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
              {item.acquiredAt ? formatDate(item.acquiredAt) : '–'}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{item.setNumber}</span> · {item.setName}
            </span>
            {item.giftedBy ? (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Gift className="size-3" aria-hidden />
                {item.giftedBy}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Was kam wann dazu": the collection laid out over time, by the day each
 * copy actually arrived. Newest first, because that is what people look for.
 */
export default async function VerlaufPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;

  const unit: TimelineUnit = single(params.ansicht) === 'monate' ? 'month' : 'year';
  const collectors = listCollectors();
  const collectorId = await activeCollectorId(single(params.sammler));
  const activeCollector = collectors.find((row) => row.id === collectorId) ?? null;

  const timeline = buildTimeline(listTimelineItems(collectorId), unit);
  const datedCount = timeline.buckets.at(-1)?.cumulative ?? 0;
  const rows = timelineRows(timeline.buckets);

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
          <h1 className="text-2xl font-semibold tracking-tight">Verlauf</h1>
          <p className="text-sm text-muted-foreground">
            {activeCollector
              ? `Was wann zu ${activeCollector.name} kam – nach dem Tag, an dem das Set ins Haus kam.`
              : 'Was wann dazukam – nach dem Tag, an dem das Set ins Haus kam.'}
          </p>
        </div>
      </div>

      <nav aria-label="Ansicht" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1.5">
        {VIEWS.map((view) => {
          const active = view.unit === unit;
          return (
            <Link
              key={view.unit}
              href={view.param ? `/sammlung/verlauf?ansicht=${view.param}` : '/sammlung/verlauf'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 shrink-0 items-center rounded-[calc(var(--radius)*0.7)] border-[length:max(1px,var(--edge-w))] px-3 text-sm font-bold whitespace-nowrap transition-colors',
                active
                  ? 'border-edge bg-card text-card-foreground shadow-(--lift-sm)'
                  : 'border-transparent text-muted-foreground hover:bg-muted',
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </nav>

      {timeline.buckets.length === 0 && timeline.undated.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch nichts in der Sammlung – hier erscheint, was wann dazukam.
          </p>
          <Link href="/katalog" className="text-sm underline underline-offset-4">
            Zum Katalog
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {pluralize(datedCount, 'Exemplar', 'Exemplare')} mit Datum
            {timeline.undated.length > 0
              ? ` · ${formatNumber(timeline.undated.length)} ohne`
              : ''}
            . Verkaufte Sets zählen nicht mit.
          </p>

          {rows.length > 0 ? (
            <ul className="space-y-2">
              {rows.map((row) =>
                row.kind === 'gap' ? (
                  <li
                    key={row.key}
                    className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
                  >
                    {row.from === row.to ? row.from : `${row.from} bis ${row.to}`}: nichts
                    dazugekommen · insgesamt {formatNumber(row.cumulative)}
                  </li>
                ) : (
                  <li key={row.bucket.key}>
                    <details className="rounded-lg border border-border bg-card">
                      <summary
                        className={cn(
                          'grid cursor-pointer list-none items-center gap-x-3 gap-y-1 p-3 [&::-webkit-details-marker]:hidden',
                          unit === 'month'
                            ? 'grid-cols-[8.5rem_minmax(0,1fr)_2.5rem]'
                            : 'grid-cols-[4rem_minmax(0,1fr)_2.5rem]',
                        )}
                      >
                        <span className="text-sm font-bold">{row.bucket.label}</span>
                        <span className="h-4 overflow-hidden rounded-sm bg-muted" aria-hidden>
                          <span
                            className="block h-full rounded-sm bg-primary"
                            style={{ width: `${(row.bucket.count / timeline.maxCount) * 100}%` }}
                          />
                        </span>
                        <span className="text-right text-sm font-bold tabular-nums">
                          {row.bucket.count}
                          <span className="sr-only">
                            {' '}
                            {row.bucket.count === 1 ? 'Set' : 'Sets'}
                          </span>
                        </span>
                        <span className="col-span-3 text-xs text-muted-foreground">
                          {[
                            row.bucket.pieces > 0
                              ? `${formatNumber(row.bucket.pieces)} Teile`
                              : null,
                            row.bucket.spentCents > 0
                              ? `${formatEuro(row.bucket.spentCents)} ausgegeben`
                              : null,
                            row.bucket.gifts > 0
                              ? pluralize(row.bucket.gifts, 'Geschenk', 'Geschenke')
                              : null,
                            `insgesamt ${formatNumber(row.bucket.cumulative)}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </summary>
                      <div className="border-t border-border px-3 pb-1">
                        <SetList items={row.bucket.items} />
                      </div>
                    </details>
                  </li>
                ),
              )}
            </ul>
          ) : null}

          {timeline.undated.length > 0 ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <details>
                  <summary className="cursor-pointer text-sm font-bold">
                    Ohne Kaufdatum ({formatNumber(timeline.undated.length)})
                  </summary>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Das Datum trägst du auf der Seite des Sets nach: unter „In der Sammlung“ den
                    Eintrag bearbeiten, Feld „Im Besitz seit“.
                  </p>
                  <SetList items={timeline.undated} />
                </details>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
