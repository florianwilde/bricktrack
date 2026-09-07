import type { Metadata } from 'next';
import { ThemeList, type ThemeRow } from '@/components/verwaltung/theme-list';
import { listManufacturers, listThemes } from '@/lib/queries/master-data';

export const metadata: Metadata = { title: 'Themen' };

export default function ThemenPage() {
  const manufacturers = listManufacturers().map((row) => ({ id: row.id, name: row.name }));

  const rows: ThemeRow[] = listThemes().map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: [row.manufacturerName, row.parentName ? `in ${row.parentName}` : null]
      .filter(Boolean)
      .join(' · '),
    manufacturerId: row.manufacturerId,
    parentThemeId: row.parentThemeId,
  }));

  if (manufacturers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Themen gehören immer zu einem Hersteller. Leg zuerst einen Hersteller an.
      </p>
    );
  }

  return <ThemeList themes={rows} manufacturers={manufacturers} />;
}
