import type { Metadata } from 'next';
import Link from 'next/link';
import { RebrickableImport } from '@/components/katalog/rebrickable-import';
import { SetForm } from '@/components/katalog/set-form';
import { Button } from '@/components/ui/button';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';
import { isRebrickableEnabled } from '@/lib/rebrickable';
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

  const importEnabled = isRebrickableEnabled();

  if (manufacturers.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Neues Set</h1>

        {/* The Lego import creates its manufacturer itself, so it works even
            on a completely empty instance. */}
        <RebrickableImport enabled={importEnabled} />

        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          Für ein Set von Hand brauchst du zuerst einen Hersteller – Lego, Playmobil, Cobi oder
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
      <RebrickableImport enabled={importEnabled} />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        oder von Hand
        <span className="h-px flex-1 bg-border" />
      </div>

      <SetForm manufacturers={manufacturers} themes={themes} defaultEan={ean} />
    </div>
  );
}
