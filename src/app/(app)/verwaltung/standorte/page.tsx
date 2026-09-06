import type { Metadata } from 'next';
import { LocationList, type LocationRow } from '@/components/verwaltung/location-list';
import { listLocations } from '@/lib/queries/master-data';

export const metadata: Metadata = { title: 'Standorte' };

export default function StandortePage() {
  const rows: LocationRow[] = listLocations().map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: row.parentName ? `in ${row.parentName}` : null,
    parentLocationId: row.parentLocationId,
  }));

  return <LocationList locations={rows} />;
}
