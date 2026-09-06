import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SetForm } from '@/components/katalog/set-form';
import { getSetById } from '@/lib/queries/catalog';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Set bearbeiten' };

export default async function SetBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const set = getSetById(id);
  if (!set) notFound();

  const manufacturers = listManufacturers().map((row) => ({ id: row.id, name: row.name }));
  const themes = listThemes().map((row) => ({
    id: row.id,
    name: row.name,
    manufacturerId: row.manufacturerId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set bearbeiten</h1>
        <p className="text-sm text-muted-foreground">
          {set.setNumber} · {set.name}
        </p>
      </div>
      <SetForm
        manufacturers={manufacturers}
        themes={themes}
        set={{
          id: set.id,
          manufacturerId: set.manufacturerId,
          themeId: set.themeId,
          setNumber: set.setNumber,
          name: set.name,
          year: set.year,
          pieceCount: set.pieceCount,
          minifigCount: set.minifigCount,
          ean: set.ean,
          ageRange: set.ageRange,
          imageUrl: set.imageUrl,
          imagePath: set.imagePath,
          retailPriceCents: set.retailPriceCents,
          notes: set.notes,
        }}
      />
    </div>
  );
}
