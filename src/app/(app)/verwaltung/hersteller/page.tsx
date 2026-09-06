import type { Metadata } from 'next';
import { ManufacturerList, type ManufacturerRow } from '@/components/verwaltung/manufacturer-list';
import { pluralize } from '@/lib/format';
import { listManufacturers } from '@/lib/queries/master-data';

export const metadata: Metadata = { title: 'Hersteller' };

export default function HerstellerPage() {
  const rows: ManufacturerRow[] = listManufacturers().map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: [pluralize(row.setCount, 'Set', 'Sets'), row.website]
      .filter(Boolean)
      .join(' · '),
    website: row.website,
    setCount: row.setCount,
  }));

  return <ManufacturerList manufacturers={rows} />;
}
