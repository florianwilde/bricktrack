import Link from 'next/link';
import { ChevronRight, Gift, PackageSearch, Plus } from 'lucide-react';
import { cn } from 'cn';
import { Studs } from '@/components/brick/studs';
import { Button } from '@/components/ui/button';
import { brickRow } from '@/lib/brick-row';
import { activeCollectorId } from '@/lib/collector-choice';
import { collectorDotClass } from '@/lib/collector-colors';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { formatEuro } from '@/lib/money';
import { countMissingSets, getCollectionStats } from '@/lib/queries/collection';
import { countItemsPerCollector, listCollectors } from '@/lib/queries/collectors';
import { listWishlists } from '@/lib/queries/wishlists';
import { daysUntil } from '@/lib/reminders';
import { requireUser } from '@/lib/session';

function daysLabel(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  return `in ${days} Tagen`;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const rawCollector = Array.isArray(params.sammler) ? params.sammler[0] : params.sammler;

  // With a child chosen in the header, the start page is about that child.
  const collectorId = await activeCollectorId(rawCollector);
  const stats = getCollectionStats(collectorId);
  const missing = countMissingSets(collectorId);
  const totalSets = stats.setCount + missing;

  const collectors = listCollectors();
  const activeCollector = collectors.find((entry) => entry.id === collectorId) ?? null;
  const perCollector = countItemsPerCollector();
  const showCollectors = collectors.length > 1 && !activeCollector;
  const bricks = brickRow(
    stats.setCount,
    totalSets,
    activeCollector
      ? [{ key: activeCollector.id, count: 1 }]
      : showCollectors
        ? collectors.map((entry) => ({ key: entry.id, count: perCollector.get(entry.id) ?? 0 }))
        : [],
  );
  const colorById = new Map(collectors.map((entry) => [entry.id, entry.color]));

  // The next date someone could bring a present for.
  const now = new Date();
  const nextEvent =
    listWishlists(user.id)
      .filter((list) => list.eventDate && daysUntil(list.eventDate, now) >= 0)
      .sort((a, b) => a.eventDate!.getTime() - b.eventDate!.getTime())[0] ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <h1 className="text-3xl font-semibold tracking-tight">Hallo {user.name}!</h1>

      <section className="relative">
        <Studs count={3} />
        <div className="brick rounded-xl bg-card p-4 text-card-foreground">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {activeCollector ? `Sammlung von ${activeCollector.name}` : 'Unsere Sammlung'}
            </h2>
            <p className="text-sm font-semibold text-muted-foreground">
              {formatNumber(stats.setCount)} von {pluralize(totalSets, 'Set', 'Sets')}
            </p>
          </div>

          <ol
            aria-label={`${formatNumber(stats.setCount)} von ${formatNumber(totalSets)} Sets vorhanden`}
            className="mt-5 grid grid-cols-10 items-end gap-1.5"
          >
            {bricks.map((key, index) => (
              <li key={index} aria-hidden className="relative">
                {key === null ? (
                  <span className="block h-7 rounded-[6px] border-2 border-dashed border-muted-foreground/50" />
                ) : (
                  <>
                    <span
                      className={cn(
                        'stud mx-auto mb-[calc(var(--edge-w)*-1)] !h-1.5 !w-3 !rounded-t-[4px] [display:var(--studs)]',
                        key ? collectorDotClass(colorById.get(key)) : 'bg-secondary',
                      )}
                    />
                    <span
                      className={cn(
                        'block h-7 rounded-[6px] border-[length:var(--edge-w)] border-edge',
                        key ? collectorDotClass(colorById.get(key)) : 'bg-secondary',
                      )}
                    />
                  </>
                )}
              </li>
            ))}
          </ol>

          {showCollectors ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
              {collectors.map((entry) => (
                <li key={entry.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      'size-3 rounded-[3px] border-[length:var(--edge-w)] border-edge',
                      collectorDotClass(entry.color),
                    )}
                  />
                  {entry.name}
                </li>
              ))}
              <li className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden
                  className="size-3 rounded-[3px] border-2 border-dashed border-muted-foreground/50"
                />
                fehlt noch
              </li>
            </ul>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="relative">
          <Studs studClassName="bg-secondary" />
          <div className="brick h-full rounded-xl bg-secondary p-4 text-secondary-foreground">
            <p className="text-2xl font-bold tabular-nums [font-family:var(--font-display)]">
              {formatNumber(stats.pieceCount)}
            </p>
            <p className="text-sm font-semibold">Teile verbaut</p>
          </div>
        </div>
        <div className="relative">
          <Studs studClassName="bg-owned" />
          <div className="brick h-full rounded-xl bg-owned p-4 text-owned-foreground">
            <p className="text-2xl font-bold tabular-nums [font-family:var(--font-display)]">
              {formatEuro(stats.currentValueCents)}
            </p>
            <p className="text-sm font-semibold">
              {stats.currentValueCents === stats.retailValueCents ? 'Wert nach UVP' : 'Aktueller Wert'}
            </p>
          </div>
        </div>
      </section>

      {nextEvent?.eventDate ? (
        <Link href={`/wunschlisten/${nextEvent.id}`} className="relative block rounded-xl">
          <Studs count={4} studClassName="bg-primary" />
          <div className="brick flex items-center gap-4 rounded-xl bg-primary p-4 text-primary-foreground">
            <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border-[length:var(--edge-w)] border-edge bg-card text-card-foreground">
              <span className="text-xl leading-none font-bold [font-family:var(--font-display)]">
                {formatDate(nextEvent.eventDate).slice(0, 5)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold [font-family:var(--font-display)]">
                {nextEvent.title}
              </p>
              <p className="text-sm font-semibold">
                {daysLabel(daysUntil(nextEvent.eventDate, now))} ·{' '}
                {nextEvent.openCount === 1
                  ? '1 Wunsch noch offen'
                  : `${formatNumber(nextEvent.openCount)} Wünsche noch offen`}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0" aria-hidden />
          </div>
        </Link>
      ) : null}

      <section className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg">
          <Link href="/katalog?besitz=fehlt">
            <PackageSearch aria-hidden />
            {missing === 1 ? '1 Set fehlt noch' : `${formatNumber(missing)} Sets fehlen noch`}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/wunschlisten">
            <Gift aria-hidden />
            Wunschlisten
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/katalog/neu">
            <Plus aria-hidden />
            Set anlegen
          </Link>
        </Button>
      </section>
    </div>
  );
}
