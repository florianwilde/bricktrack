import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, ExternalLink, Gift, Pencil } from 'lucide-react';
import { SetPlaceholder } from '@/components/brick/set-placeholder';
import { Studs } from '@/components/brick/studs';
import { InstructionsSection } from '@/components/katalog/instructions-section';
import { PhotosSection } from '@/components/katalog/photos-section';
import { PriceSection } from '@/components/katalog/price-section';
import { SetActions } from '@/components/katalog/set-actions';
import { CollectionItemsSection } from '@/components/sammlung/collection-items-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { setImageSrc } from '@/lib/images';
import { formatEuro } from '@/lib/money';
import {
  getSetById,
  listCollectionItemsForSet,
  listInstructionsForSet,
  listPhotosForCollectionItems,
  listPhotosForSet,
  listPricePoints,
} from '@/lib/queries/catalog';
import { listMissingParts } from '@/lib/queries/collection';
import { activeCollectorId } from '@/lib/collector-choice';
import { listCollectors } from '@/lib/queries/collectors';
import { listLocations } from '@/lib/queries/master-data';
import { listWishlistsForSet, listWishlistTargets } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const set = getSetById(id);
  return { title: set ? `${set.setNumber} · ${set.name}` : 'Set' };
}

export default async function SetDetailPage({ params, searchParams }: Props) {
  await requireUser();
  const { id } = await params;
  const query = await searchParams;

  // Keeps the "vorhanden / fehlt" badge in step with the collector the user
  // was looking at in the catalog.
  const rawCollector = Array.isArray(query.sammler) ? query.sammler[0] : query.sammler;
  const collectorId = await activeCollectorId(rawCollector);
  const collectors = listCollectors();

  const set = getSetById(id, collectorId);
  if (!set) notFound();

  const image = setImageSrc(set);
  const owned = set.ownedCopies > 0;
  const locations = listLocations().map((row) => ({ id: row.id, name: row.name }));
  const locationNames = new Map(locations.map((row) => [row.id, row.name]));

  const collectorsById = new Map(collectors.map((row) => [row.id, row]));
  const itemRows = listCollectionItemsForSet(set.id);
  const itemPhotos = listPhotosForCollectionItems(itemRows.map((item) => item.id));
  const collectionItems = itemRows.map((item) => ({
    ...item,
    photos: itemPhotos.get(item.id) ?? [],
    locationName: item.locationId ? (locationNames.get(item.locationId) ?? null) : null,
    setName: `${set.setNumber} · ${set.name}`,
    missingParts: listMissingParts(item.id),
    collectorName: item.collectorId ? (collectorsById.get(item.collectorId)?.name ?? null) : null,
    collectorColor: item.collectorId
      ? (collectorsById.get(item.collectorId)?.color ?? null)
      : null,
  }));

  const facts: Array<[string, string]> = [
    ['Hersteller', set.manufacturerName],
    ['Thema', set.themeName ?? '–'],
    ['Setnummer', set.setNumber],
    ['Jahr', set.year ? String(set.year) : '–'],
    ['Teile', formatNumber(set.pieceCount)],
    ['Minifiguren', formatNumber(set.minifigCount)],
    ['Alter', set.ageRange ?? '–'],
    ['EAN', set.ean ?? '–'],
    ['UVP', formatEuro(set.retailPriceCents)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {set.setNumber}
            </Badge>
            <Badge variant="secondary">{set.manufacturerName}</Badge>
            {owned ? (
              <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                <Check className="size-3" aria-hidden />
                {set.ownedCopies > 1 ? `${set.ownedCopies}× vorhanden` : 'Vorhanden'}
              </Badge>
            ) : (
              <Badge variant="outline">Fehlt noch</Badge>
            )}
            {set.wishlistCount > 0 ? (
              <Badge variant="secondary" className="gap-1">
                <Gift className="size-3" aria-hidden />
                Auf Wunschliste
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{set.name}</h1>
        </div>
        <Button asChild variant="outline" size="icon-lg" aria-label="Set bearbeiten">
          <Link href={`/katalog/${set.id}/bearbeiten`}>
            <Pencil />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="relative self-start">
          <Studs count={4} />
          <div className="brick overflow-hidden rounded-xl bg-muted">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="aspect-square w-full object-contain p-3" />
            ) : (
              <SetPlaceholder
                setNumber={set.setNumber}
                manufacturerName={set.manufacturerName}
                size="lg"
                className="aspect-square"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <SetActions
            setId={set.id}
            setName={`${set.setNumber} · ${set.name}`}
            owned={owned}
            wishlists={listWishlistTargets()}
            collectors={collectors.map((row) => ({ id: row.id, name: row.name }))}
          />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {set.manufacturerWebsite ? (
            <Button asChild variant="link" size="sm" className="px-0">
              <a href={set.manufacturerWebsite} target="_blank" rel="noreferrer noopener">
                Zum Hersteller
                <ExternalLink />
              </a>
            </Button>
          ) : null}

          {set.notes ? (
            <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{set.notes}</p>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>In der Sammlung</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionItemsSection
            items={collectionItems}
            locations={locations}
            collectors={collectors.map((row) => ({ id: row.id, name: row.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preis und Wertentwicklung</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceSection
            setId={set.id}
            prices={listPricePoints(set.id)}
            retailPriceCents={set.retailPriceCents}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anleitungen</CardTitle>
        </CardHeader>
        <CardContent>
          <InstructionsSection setId={set.id} instructions={listInstructionsForSet(set.id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotosSection owner={{ kind: 'set', id: set.id }} photos={listPhotosForSet(set.id)} />
        </CardContent>
      </Card>

      <WishlistMemberships setId={set.id} />
    </div>
  );
}

function WishlistMemberships({ setId }: { setId: string }) {
  const lists = listWishlistsForSet(setId);
  if (lists.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auf diesen Wunschlisten</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {lists.map((list) => (
          <Button key={list.id} asChild variant="outline" size="sm">
            <Link href={`/wunschlisten/${list.id}`}>
              <Gift />
              {list.title}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
