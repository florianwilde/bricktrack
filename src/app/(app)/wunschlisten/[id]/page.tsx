import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogFilters } from '@/components/katalog/catalog-filters';
import { CatalogGrid } from '@/components/katalog/catalog-grid';
import { Pagination } from '@/components/katalog/pagination';
import { ShareCard } from '@/components/wunschlisten/share-card';
import { WishlistHeaderActions } from '@/components/wunschlisten/wishlist-header-actions';
import { WishlistItems } from '@/components/wunschlisten/wishlist-items';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, pluralize } from '@/lib/format';
import { occasionLabel } from '@/lib/labels';
import { CATALOG_PAGE_SIZE, listSets, listSetYears } from '@/lib/queries/catalog';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';
import { getWishlist, listWishlistItems } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const list = getWishlist(id);
  return { title: list?.title ?? 'Wunschliste' };
}

export default async function WunschlisteDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const list = getWishlist(id);
  if (!list || list.ownerUserId !== user.id) notFound();

  const items = listWishlistItems(list.id);

  // The embedded picker: missing sets that are not on this list yet. It shares
  // the URL parameters with the catalog, so the filters behave identically.
  const yearParam = single(query.jahr);
  const page = Number(single(query.seite) ?? '1') || 1;
  const missing = listSets({
    q: single(query.q),
    manufacturerId: single(query.hersteller),
    themeId: single(query.thema),
    year: yearParam ? Number(yearParam) : undefined,
    ownership: 'fehlt',
    excludeWishlistId: list.id,
    page,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{occasionLabel(list.occasion)}</Badge>
            {list.eventDate ? <Badge variant="outline">{formatDate(list.eventDate)}</Badge> : null}
            {list.surpriseMode ? <Badge variant="outline">Überraschungsmodus</Badge> : null}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{list.title}</h1>
          <p className="text-sm text-muted-foreground">
            {pluralize(items.length, 'Wunsch', 'Wünsche')}
          </p>
        </div>
        <WishlistHeaderActions
          wishlist={{
            id: list.id,
            title: list.title,
            occasion: list.occasion,
            eventDate: list.eventDate,
            note: list.note,
            isPublic: list.isPublic,
            surpriseMode: list.surpriseMode,
          }}
        />
      </div>

      <ShareCard
        wishlistId={list.id}
        shareToken={list.shareToken}
        isPublic={list.isPublic}
        title={list.title}
      />

      {list.note ? (
        <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{list.note}</p>
      ) : null}

      <WishlistItems wishlistId={list.id} items={items} surpriseMode={list.surpriseMode} />

      <Card>
        <CardHeader>
          <CardTitle>Aus fehlenden Sets hinzufügen</CardTitle>
          <CardDescription>
            Nur Sets, die noch nicht in der Sammlung und noch nicht auf dieser Liste sind. Kachel
            lange drücken oder „Auswählen“ tippen, dann mehrere auf einmal übernehmen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CatalogFilters
            options={{
              manufacturers: listManufacturers().map((row) => ({ id: row.id, name: row.name })),
              themes: listThemes().map((row) => ({
                id: row.id,
                name: row.name,
                manufacturerId: row.manufacturerId,
              })),
              years: listSetYears(),
            }}
          />

          <p className="text-sm text-muted-foreground">
            {pluralize(missing.total, 'Set kommt infrage', 'Sets kommen infrage')}
          </p>

          <CatalogGrid
            sets={missing.rows}
            wishlists={[{ id: list.id, title: list.title }]}
            defaultWishlistId={list.id}
            emptyState="Es fehlt gerade nichts, was noch nicht auf dieser Liste steht."
          />

          <Pagination page={page} total={missing.total} pageSize={CATALOG_PAGE_SIZE} />
        </CardContent>
      </Card>
    </div>
  );
}
