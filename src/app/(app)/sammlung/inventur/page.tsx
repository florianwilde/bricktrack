import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InventoryScanner } from '@/components/sammlung/inventory-scanner';
import { storedCollectorId } from '@/lib/collector-choice';
import { locationPath } from '@/lib/locations';
import { listCollectors } from '@/lib/queries/collectors';
import { listLocations } from '@/lib/queries/master-data';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Inventur' };

export default async function InventurPage() {
  await requireUser();

  const collectors = listCollectors().map((row) => ({ id: row.id, name: row.name }));
  const locations = listLocations();

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
          <h1 className="text-2xl font-semibold tracking-tight">Inventur</h1>
          <p className="text-sm text-muted-foreground">
            Kiste für Kiste scannen, am Ende alles auf einmal übernehmen. Unbekannte Sets legst du
            zwischendurch an – die Liste bleibt auf diesem Gerät erhalten.
          </p>
        </div>
      </div>

      <InventoryScanner
        collectors={collectors}
        locations={locations.map((row) => ({
          id: row.id,
          label: locationPath(row.id, locations).join(' › '),
        }))}
        initialCollectorId={(await storedCollectorId()) ?? null}
      />
    </div>
  );
}
