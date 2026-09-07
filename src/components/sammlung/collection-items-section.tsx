'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Pencil, PuzzleIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCollectionItem, updateCollectionItem } from '@/app/(app)/sammlung/actions';
import type { MissingPartRow } from '@/lib/queries/collection';
import { MissingPartsDialog } from './missing-parts-dialog';
import type { CollectionStatus, Completeness, Condition } from '@/db/types';
import { formatDate, toDateInputValue } from '@/lib/format';
import {
  COMPLETENESS_LABELS,
  CONDITION_LABELS,
  STATUS_LABELS,
  completenessLabel,
  conditionLabel,
  statusLabel,
} from '@/lib/labels';
import { centsToInput, formatEuro } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export type CollectionItemRow = {
  id: string;
  setId: string;
  status: CollectionStatus;
  completeness: Completeness;
  condition: Condition | null;
  locationId: string | null;
  locationName?: string | null;
  acquiredAt: Date | null;
  acquiredPriceCents: number | null;
  acquiredFrom: string | null;
  giftedBy: string | null;
  lentOutTo: string | null;
  notes: string | null;
  setName: string;
  missingParts: MissingPartRow[];
};

export function CollectionItemsSection({
  items,
  locations,
}: {
  items: CollectionItemRow[];
  locations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<CollectionItemRow | null>(null);
  const [deleting, setDeleting] = useState<CollectionItemRow | null>(null);
  const [parts, setParts] = useState<CollectionItemRow | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = editing;
    if (!item) return;

    const input = Object.fromEntries(new FormData(event.currentTarget).entries());
    startTransition(async () => {
      const result = await updateCollectionItem(item.id, { ...input, setId: item.setId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Sammlungseintrag gespeichert.');
      setEditing(null);
      router.refresh();
    });
  }

  function remove() {
    const item = deleting;
    if (!item) return;

    startTransition(async () => {
      const result = await deleteCollectionItem(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Sammlungseintrag entfernt.');
      setDeleting(null);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Dieses Set ist noch nicht in der Sammlung.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === 'sold' ? 'outline' : 'default'}>
                  {statusLabel(item.status)}
                </Badge>
                <Badge variant="secondary">{completenessLabel(item.completeness)}</Badge>
                {item.missingParts.some((part) => !part.resolved) ? (
                  <Badge variant="outline">
                    {item.missingParts.filter((part) => !part.resolved).length} Fehlteile
                  </Badge>
                ) : null}
                {item.locationName ? (
                  <span className="text-xs text-muted-foreground">{item.locationName}</span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {[
                  item.acquiredAt ? `Seit ${formatDate(item.acquiredAt)}` : null,
                  item.acquiredPriceCents !== null
                    ? `Gekauft für ${formatEuro(item.acquiredPriceCents)}`
                    : null,
                  item.giftedBy ? `Geschenk von ${item.giftedBy}` : null,
                  item.lentOutTo ? `Verliehen an ${item.lentOutTo}` : null,
                  item.condition ? conditionLabel(item.condition) : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Keine weiteren Angaben'}
              </p>
              {item.notes ? <p className="text-xs">{item.notes}</p> : null}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Fehlteile"
              title="Fehlteile"
              onClick={() => setParts(item)}
              disabled={pending}
            >
              <PuzzleIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Bearbeiten"
              onClick={() => setEditing(item)}
              disabled={pending}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Entfernen"
              onClick={() => setDeleting(item)}
              disabled={pending}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sammlungseintrag bearbeiten</DialogTitle>
          </DialogHeader>

          <form id="collection-item-form" onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status" htmlFor="status">
                <NativeSelect id="status" name="status" defaultValue={editing?.status ?? 'owned'}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Vollständigkeit" htmlFor="completeness">
                <NativeSelect
                  id="completeness"
                  name="completeness"
                  defaultValue={editing?.completeness ?? 'unknown'}
                >
                  {Object.entries(COMPLETENESS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Zustand" htmlFor="condition">
                <NativeSelect id="condition" name="condition" defaultValue={editing?.condition ?? 'none'}>
                  <option value="none">– keine Angabe –</option>
                  {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Standort" htmlFor="locationId">
                <NativeSelect
                  id="locationId"
                  name="locationId"
                  defaultValue={editing?.locationId ?? 'none'}
                >
                  <option value="none">– kein Standort –</option>
                  {locations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Im Besitz seit" htmlFor="acquiredAt">
                <Input
                  id="acquiredAt"
                  name="acquiredAt"
                  type="date"
                  defaultValue={toDateInputValue(editing?.acquiredAt)}
                />
              </Field>

              <Field label="Kaufpreis" htmlFor="acquiredPriceCents" hint="In Euro.">
                <Input
                  id="acquiredPriceCents"
                  name="acquiredPriceCents"
                  inputMode="decimal"
                  defaultValue={centsToInput(editing?.acquiredPriceCents)}
                />
              </Field>

              <Field label="Gekauft bei" htmlFor="acquiredFrom">
                <Input
                  id="acquiredFrom"
                  name="acquiredFrom"
                  defaultValue={editing?.acquiredFrom ?? ''}
                  maxLength={120}
                />
              </Field>

              <Field label="Geschenkt von" htmlFor="giftedBy">
                <Input
                  id="giftedBy"
                  name="giftedBy"
                  defaultValue={editing?.giftedBy ?? ''}
                  maxLength={120}
                />
              </Field>

              <Field label="Verliehen an" htmlFor="lentOutTo">
                <Input
                  id="lentOutTo"
                  name="lentOutTo"
                  defaultValue={editing?.lentOutTo ?? ''}
                  maxLength={120}
                />
              </Field>
            </div>

            <Field label="Notizen" htmlFor="item-notes">
              <Textarea id="item-notes" name="notes" defaultValue={editing?.notes ?? ''} rows={3} />
            </Field>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="collection-item-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {parts ? (
        <MissingPartsDialog
          collectionItemId={parts.id}
          setName={parts.setName}
          parts={parts.missingParts}
          open
          onOpenChange={(open) => !open && setParts(null)}
        />
      ) : null}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Set bleibt im Katalog, gilt danach aber wieder als „fehlt noch“.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
