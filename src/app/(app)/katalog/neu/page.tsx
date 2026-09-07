import type { Metadata } from 'next';
import Link from 'next/link';
import { SetForm } from '@/components/katalog/set-form';
import { Button } from '@/components/ui/button';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Neues Set' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NeuesSetPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const ean = typeof params.ean === 'string' ? params.ean : undefined;

  const manufacturers = listManufacturers().map((row) => ({ id: row.id, name: row.name }));
  const themes = listThemes().map((row) => ({
    id: row.id,
    name: row.name,
    manufacturerId: row.manufacturerId,
  }));

  if (manufacturers.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Neues Set</h1>
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Jedes Set gehört zu einem Hersteller. Leg zuerst einen an – Lego, Playmobil, Cobi oder
          was auch immer im Kinderzimmer steht.
        </p>
        <Button asChild size="lg">
          <Link href="/verwaltung/hersteller">Hersteller anlegen</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Neues Set</h1>
        <p className="text-sm text-muted-foreground">
          Ein Set im Katalog heißt noch nicht, dass es da ist – das legst du danach über „Zur
          Sammlung hinzufügen“ fest.
        </p>
      </div>
      <SetForm manufacturers={manufacturers} themes={themes} defaultEan={ean} />
    </div>
  );
}
