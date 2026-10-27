'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { resolveMissingParts } from '@/app/(app)/sammlung/actions';
import type { MissingPartEntry, ShoppingLine } from '@/lib/shopping-list';
import { Checkbox } from '@/components/ui/checkbox';

function SetLinks({ entries }: { entries: MissingPartEntry[] }) {
  // One copy can need the same part twice (two entries); name each set once.
  const sets = [...new Map(entries.map((entry) => [entry.setId, entry])).values()];
  return (
    <span className="text-xs text-muted-foreground">
      für{' '}
      {sets.map((entry, index) => (
        <span key={entry.setId}>
          {index > 0 ? ', ' : ''}
          <Link href={`/katalog/${entry.setId}`} className="underline-offset-2 hover:underline">
            {entry.setNumber} {entry.setName}
          </Link>
        </span>
      ))}
    </span>
  );
}

/**
 * The lines of the shopping list. Ticking one off resolves every missing part
 * behind it, in all sets at once - it arrived, it goes into all the boxes.
 */
export function ShoppingListLines({
  lines,
  withoutPartNumber,
}: {
  lines: ShoppingLine[];
  withoutPartNumber: MissingPartEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resolve(ids: string[], label: string) {
    startTransition(async () => {
      const result = await resolveMissingParts(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} als erledigt abgehakt.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {lines.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {lines.map((line) => (
            <li key={line.key} className="flex items-start gap-3 p-3">
              <Checkbox
                className="mt-1"
                checked={false}
                disabled={pending}
                onCheckedChange={() =>
                  resolve(
                    line.entries.map((entry) => entry.id),
                    `${line.quantity}× ${line.partNumber}`,
                  )
                }
                aria-label={`${line.quantity}× ${line.partNumber} als erledigt abhaken`}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm">
                  <span className="font-bold tabular-nums">{line.quantity}×</span>{' '}
                  <span className="font-mono font-bold">{line.partNumber}</span>
                  {line.colorName ? ` · ${line.colorName}` : ' · ohne Farbe'}
                </p>
                <SetLinks entries={line.entries} />
                {line.looksLikeElementId ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TriangleAlert className="size-3 shrink-0" aria-hidden />
                    Sieht aus wie eine Element-Nummer – BrickLink braucht die Teilenummer.
                  </p>
                ) : line.colorName && line.bricklinkColorId === null ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TriangleAlert className="size-3 shrink-0" aria-hidden />
                    Farbe „{line.colorName}“ unbekannt – auf BrickLink steht sie auf „beliebig“.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {withoutPartNumber.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-bold">Ohne Teilenummer ({withoutPartNumber.length})</h2>
          <p className="text-xs text-muted-foreground">
            Nur mit Notiz vermerkt – stehen nicht im Download. Die Nummer trägst du am Exemplar unter
            „Fehlteile“ nach.
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {withoutPartNumber.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 p-3">
                <Checkbox
                  className="mt-1"
                  checked={false}
                  disabled={pending}
                  onCheckedChange={() => resolve([entry.id], 'Eintrag')}
                  aria-label="Als erledigt abhaken"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm">
                    <span className="font-bold tabular-nums">{entry.quantity}×</span>{' '}
                    {entry.notes ?? 'Teil'}
                    {entry.colorName ? ` · ${entry.colorName}` : ''}
                  </p>
                  <SetLinks entries={[entry]} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
