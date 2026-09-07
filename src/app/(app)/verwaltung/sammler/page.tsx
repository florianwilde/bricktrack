import type { Metadata } from 'next';
import { CollectorList, type CollectorRowItem } from '@/components/verwaltung/collector-list';
import { formatDate, pluralize } from '@/lib/format';
import { COLLECTOR_COLOR_LABELS } from '@/lib/collector-colors';
import { listCollectors } from '@/lib/queries/collectors';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Sammler' };

export default async function SammlerPage() {
  await requireUser();

  const collectors = listCollectors();
  const rows: CollectorRowItem[] = collectors.map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: [
      pluralize(row.itemCount, 'Set', 'Sets'),
      COLLECTOR_COLOR_LABELS[row.color],
      row.birthday ? `geboren am ${formatDate(row.birthday)}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    color: row.color,
    birthday: row.birthday,
    notes: row.notes,
    itemCount: row.itemCount,
  }));

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Der Katalog ist gemeinsam: Ein Set existiert einmal, unabhängig davon, wer es hat.
        Sammlung und Wunschlisten gehören dagegen je einem Sammler. Solange es nur einen gibt,
        taucht die Unterscheidung nirgends in der App auf – sie erscheint erst mit dem zweiten.
      </p>
      <CollectorList collectors={rows} />
    </div>
  );
}
