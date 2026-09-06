import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { CatalogFilters } from '@/components/katalog/catalog-filters';
import { CatalogGrid } from '@/components/katalog/catalog-grid';
import { Pagination } from '@/components/katalog/pagination';
import { Button } from '@/components/ui/button';
import { pluralize } from '@/lib/format';
import { OWNERSHIP_FILTER_LABELS, parseOwnershipFilter } from '@/lib/ownership';
import { CATALOG_PAGE_SIZE, listSets, listSetYears } from '@/lib/queries/catalog';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';
import { listWishlistTargets } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Katalog' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length > 0 ? raw : undefined;
}

export default async function KatalogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;

  const ownership = parseOwnershipFilter(single(params.besitz));
  const yearParam = single(params.jahr);
  const page = Number(single(params.seite) ?? '1') || 1;

  const filters = {
    q: single(params.q),
    manufacturerId: single(params.hersteller),
    themeId: single(params.thema),
    year: yearParam ? Number(yearParam) : undefined,
    ownership,
    page,
  };

  const { rows, total } = listSets(filters);
  const manufacturers = listManufacturers().map((row) => ({ id: row.id, name: row.name }));
  const themes = listThemes().map((row) => ({
    id: row.id,
    name: row.name,
    manufacturerId: row.manufacturerId,
  }));
  const wishlists = listWishlistTargets();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ownership === 'fehlt' ? 'Fehlende Sets' : 'Katalog'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ownership === 'fehlt'
              ? 'Sets, die noch nicht in der Sammlung sind.'
              : 'Alle bekannten Sets – unabhängig davon, ob sie schon da sind.'}
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link href="/katalog/neu">
            <Plus />
            <span className="hidden sm:inline">Set anlegen</span>
          </Link>
        </Button>
      </div>

      <CatalogFilters options={{ manufacturers, themes, years: listSetYears() }} />

      <p className="text-sm text-muted-foreground">
        {pluralize(total, 'Set', 'Sets')}
        {ownership !== 'alle' ? ` · ${OWNERSHIP_FILTER_LABELS[ownership]}` : ''}
      </p>

      <CatalogGrid sets={rows} wishlists={wishlists} />

      <Pagination page={page} total={total} pageSize={CATALOG_PAGE_SIZE} />
    </div>
  );
}
