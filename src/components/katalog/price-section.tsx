'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addPricePoint, deletePricePoint } from '@/app/(app)/katalog/price-actions';
import { formatDate, toDateInputValue } from '@/lib/format';
import { formatEuro } from '@/lib/money';
import { priceTrend, type PriceObservation } from '@/lib/prices';
import type { PricePointRow } from '@/lib/queries/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neu',
  used: 'Gebraucht',
};

/**
 * Observed prices for one set.
 *
 * The point is not the single current price but the development: what a set
 * did since it was bought. Everything here is maintained by hand - no price
 * service is queried, and nothing leaves the server.
 */
export function PriceSection({
  setId,
  prices,
  retailPriceCents,
}: {
  setId: string;
  prices: PricePointRow[];
  retailPriceCents: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const observations: PriceObservation[] = prices.map((price) => ({
    priceCents: price.priceCents,
    condition: price.condition,
    observedAt: price.observedAt,
  }));
  const trend = priceTrend(observations, retailPriceCents);
  const gained = (trend.changeCents ?? 0) > 0;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form).entries());

    startTransition(async () => {
      const result = await addPricePoint(setId, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      form.reset();
      setOpen(false);
      toast.success('Preis notiert.');
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePricePoint(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Eintrag gelöscht.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Ursprünglich</dt>
          <dd className="font-medium">{formatEuro(trend.baseCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Aktuell</dt>
          <dd className="font-medium">{formatEuro(trend.currentCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Entwicklung</dt>
          <dd>
            {trend.changePercent === null ? (
              <span className="text-muted-foreground">–</span>
            ) : (
              <span
                className={`flex items-center gap-1 font-medium ${
                  gained ? 'text-emerald-600' : 'text-muted-foreground'
                }`}
              >
                {gained ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                )}
                {trend.changePercent > 0 ? '+' : ''}
                {trend.changePercent.toLocaleString('de-DE')} %
              </span>
            )}
          </dd>
        </div>
      </dl>

      {prices.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {prices.map((price) => (
            <li key={price.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {formatEuro(price.priceCents)}{' '}
                  <Badge variant="secondary">{CONDITION_LABELS[price.condition]}</Badge>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[formatDate(price.observedAt), price.source, price.note]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Preis löschen"
                onClick={() => remove(price.id)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch kein Preis notiert. Der Ausgangswert ist die UVP des Sets.
        </p>
      )}

      {open ? (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Preis notieren</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Preis" htmlFor="priceCents" required hint="In Euro.">
              <Input
                id="priceCents"
                name="priceCents"
                inputMode="decimal"
                required
                placeholder="79,99"
              />
            </Field>
            <Field label="Zustand" htmlFor="condition">
              <NativeSelect id="condition" name="condition" defaultValue="new">
                <option value="new">Neu</option>
                <option value="used">Gebraucht</option>
              </NativeSelect>
            </Field>
            <Field label="Gesehen am" htmlFor="observedAt" hint="Leer = heute.">
              <Input
                id="observedAt"
                name="observedAt"
                type="date"
                defaultValue={toDateInputValue(new Date())}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wo" htmlFor="source">
              <Input id="source" name="source" maxLength={80} placeholder="Amazon, Flohmarkt …" />
            </Field>
            <Field label="Notiz" htmlFor="price-note">
              <Input id="price-note" name="note" maxLength={200} />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Speichern
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus />
          Preis notieren
        </Button>
      )}
    </div>
  );
}
