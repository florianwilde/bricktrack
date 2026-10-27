import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrickLogo } from '@/components/brick/logo';
import { PrintButton } from '@/components/etiketten/print-button';
import { env } from '@/env';
import { pluralize } from '@/lib/format';
import { locationContentsPath, locationPath } from '@/lib/locations';
import { qrSvg } from '@/lib/qr';
import { listLocations } from '@/lib/queries/master-data';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Etiketten' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Printable labels for storage places. Each carries a QR code with the full
 * address of the place's contents, so any phone camera opens the list - and
 * the scanner in the app understands it too.
 *
 * `?standort=<id>` (repeatable) picks places; without it, all of them.
 */
export default async function EtikettenPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const wanted = [params.standort].flat().filter((value): value is string => Boolean(value));

  const locations = listLocations();
  const chosen = wanted.length > 0 ? locations.filter((row) => wanted.includes(row.id)) : locations;
  const labels = chosen.map((row) => {
    const path = locationPath(row.id, locations);
    return {
      id: row.id,
      name: row.name,
      outer: path.slice(0, -1).join(' › '),
      svg: qrSvg(`${env.BASE_URL}${locationContentsPath(row.id)}`),
    };
  });

  return (
    <div className="space-y-5">
      <div className="space-y-3 print:hidden">
        <Link
          href="/verwaltung/standorte"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Standorte
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Etiketten</h1>
          <p className="text-sm text-muted-foreground">
            {labels.length === 0
              ? 'Noch keine Standorte angelegt.'
              : `${pluralize(labels.length, 'Etikett', 'Etiketten')} zum Ausschneiden. Den Code scannt jede Handykamera oder der Scanner in Bricktrack – er zeigt, was in der Kiste liegt.`}
          </p>
        </div>
        {labels.length > 0 ? <PrintButton /> : null}
      </div>

      {/* Fixed colours on purpose: a label is printed on white paper, whatever the design. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {labels.map((label) => (
          <li
            key={label.id}
            className="flex break-inside-avoid items-center gap-4 rounded-lg border-2 border-dashed border-neutral-400 bg-white p-4 text-neutral-950 print:rounded-none"
          >
            <div
              className="size-32 shrink-0 print:size-[3.5cm]"
              role="img"
              aria-label={`QR-Code für ${label.name}`}
              // Generated on the server from our own URL - no user markup in here.
              dangerouslySetInnerHTML={{ __html: label.svg }}
            />
            <div className="min-w-0 space-y-1">
              {label.outer ? (
                <p className="text-xs font-semibold text-neutral-600">{label.outer}</p>
              ) : null}
              <p className="text-2xl leading-tight font-bold break-words">{label.name}</p>
              <p className="flex items-center gap-1.5 pt-1 text-xs text-neutral-600">
                <BrickLogo className="size-4" />
                Bricktrack
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
