import type { Metadata } from 'next';
import Link from 'next/link';
import { Boxes, Euro, Layers, PackageSearch } from 'lucide-react';
import { SetPlaceholder } from '@/components/brick/set-placeholder';
import { Studs } from '@/components/brick/studs';
import { CollectionFilters } from '@/components/sammlung/collection-filters';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatNumber, pluralize } from '@/lib/format';
import { collectorBadgeClass, collectorDotClass } from '@/lib/collector-colors';
import { setImageSrc } from '@/lib/images';
import { completenessLabel, statusLabel } from '@/lib/labels';
import { formatEuro } from '@/lib/money';
import {
  countMissingSets,
  countOpenMissingParts,
  getCollectionStats,
  listCollectionItems,
  type CollectionFilters as Filters,
} from '@/lib/queries/collection';
import { activeCollectorId } from '@/lib/collector-choice';
import { listCollectors } from '@/lib/queries/collectors';
import { listLocations, listManufacturers } from '@/lib/queries/master-data';
import { requireUser } from '@/lib/session';
import type { CollectionStatus, Completeness } from '@/db/types';

export const metadata: Metadata = { title: 'Sammlung' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function SammlungPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;

  const collectors = listCollectors();
  const collectorId = await activeCollectorId(single(params.sammler));
  const activeCollector = collectors.find((row) => row.id === collectorId) ?? null;

  const filters: Filters = {
    q: single(params.q),
    status: single(params.status) as CollectionStatus | undefined,
    completeness: single(params.zustand) as Completeness | undefined,
    locationId: single(params.standort),
    manufacturerId: single(params.hersteller),
    collectorId,
  };

  const items = listCollectionItems(filters);
  const openParts = countOpenMissingParts(items.map((item) => item.id));
  const stats = getCollectionStats(collectorId);
  const missing = countMissingSets(collectorId);

  const tiles = [
    { icon: Boxes, label: 'Sets', value: formatNumber(stats.setCount) },
    { icon: Layers, label: 'Teile gesamt', value: formatNumber(stats.pieceCount) },
    {
      icon: Euro,
      // Notierte Preise gehen vor, sonst die UVP.
      label: stats.currentValueCents === stats.retailValueCents ? 'Wert nach UVP' : 'Aktueller Wert',
      value: formatEuro(stats.currentValueCents),
    },
    { icon: PackageSearch, label: 'Fehlt noch', value: formatNumber(missing) },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sammlung</h1>
        <p className="text-sm text-muted-foreground">
          {activeCollector
            ? `Alles, was ${activeCollector.name} tatsächlich hat.`
            : 'Alles, was tatsächlich da ist.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="space-y-1 p-4">
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
              <p className="text-xl font-semibold tabular-nums">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.byManufacturer.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {stats.byManufacturer.map((row) => (
            <Badge key={row.name} variant="secondary">
              {row.name}: {formatNumber(row.count)}
            </Badge>
          ))}
        </div>
      ) : null}

      <CollectionFilters
        locations={listLocations().map((row) => ({ id: row.id, name: row.name }))}
        manufacturers={listManufacturers().map((row) => ({ id: row.id, name: row.name }))}
      />

      <p className="text-sm text-muted-foreground">
        {pluralize(items.length, 'Eintrag', 'Einträge')}
      </p>

      {items.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Hier ist noch nichts. Sets kommen über den Katalog in die Sammlung.
          </p>
          <Link href="/katalog" className="text-sm underline underline-offset-4">
            Zum Katalog
          </Link>
        </div>
      ) : (
        <ul className="space-y-5 pt-2">
          {items.map((item) => {
            const image = setImageSrc(item);
            return (
              <li key={item.id} className="relative">
                {/* The studs carry the collector's colour once there is more than one. */}
                <Studs
                  studClassName={
                    collectors.length > 1 ? collectorDotClass(item.collectorColor) : undefined
                  }
                />
                <Link
                  href={`/katalog/${item.setId}`}
                  className="brick flex items-center gap-3 rounded-xl bg-card p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg border-[length:max(1px,var(--edge-w))] border-edge bg-muted">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" loading="lazy" className="size-full object-contain" />
                    ) : (
                      <SetPlaceholder
                        setNumber={item.setNumber}
                        manufacturerName={item.manufacturerName}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.setName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.setNumber, item.manufacturerName, item.locationName]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {/* Green like "Vorhanden" in the catalog; red stays for actions. */}
                      <Badge
                        variant={item.status === 'sold' ? 'outline' : 'default'}
                        className={item.status === 'sold' ? undefined : 'bg-owned text-owned-foreground'}
                      >
                        {statusLabel(item.status)}
                      </Badge>
                      {item.completeness !== 'unknown' ? (
                        <Badge variant="secondary">{completenessLabel(item.completeness)}</Badge>
                      ) : null}
                      {collectors.length > 1 && item.collectorName ? (
                        <Badge className={collectorBadgeClass(item.collectorColor)}>
                          {item.collectorName}
                        </Badge>
                      ) : null}
                      {openParts.get(item.id) ? (
                        <Badge variant="outline">{openParts.get(item.id)} Fehlteile</Badge>
                      ) : null}
                      {item.acquiredAt ? (
                        <span className="text-xs text-muted-foreground">
                          seit {formatDate(item.acquiredAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
