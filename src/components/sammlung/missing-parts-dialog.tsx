'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addMissingPart,
  deleteMissingPart,
  setMissingPartResolved,
} from '@/app/(app)/sammlung/actions';
import type { MissingPartRow } from '@/lib/queries/collection';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/**
 * Missing parts of one owned copy.
 *
 * Adding an entry marks the copy as incomplete, resolving the last one marks
 * it complete again - so the collection filter stays truthful without anyone
 * having to remember to update it.
 */
export function MissingPartsDialog({
  collectionItemId,
  setName,
  parts,
  open,
  onOpenChange,
}: {
  collectionItemId: string;
  setName: string;
  parts: MissingPartRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form).entries());

    startTransition(async () => {
      const result = await addMissingPart(collectionItemId, input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      form.reset();
      toast.success('Fehlteil vermerkt.');
      router.refresh();
    });
  }

  function toggle(part: MissingPartRow) {
    startTransition(async () => {
      const result = await setMissingPartResolved(part.id, !part.resolved);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(part: MissingPartRow) {
    startTransition(async () => {
      const result = await deleteMissingPart(part.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Eintrag gelöscht.');
      router.refresh();
    });
  }

  const open_ = parts.filter((part) => !part.resolved).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fehlteile</DialogTitle>
          <DialogDescription>
            {setName} –{' '}
            {open_ === 0
              ? 'aktuell fehlt nichts.'
              : open_ === 1
                ? 'ein Teil fehlt noch.'
                : `${open_} Teile fehlen noch.`}
          </DialogDescription>
        </DialogHeader>

        {parts.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {parts.map((part) => (
              <li key={part.id} className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={part.resolved}
                  onCheckedChange={() => toggle(part)}
                  disabled={pending}
                  aria-label={part.resolved ? 'Wieder als fehlend markieren' : 'Als erledigt markieren'}
                />
                <div className={cn('min-w-0 flex-1', part.resolved && 'opacity-50')}>
                  <p className={cn('truncate text-sm font-medium', part.resolved && 'line-through')}>
                    {part.quantity}× {part.partNumber ?? 'Teil'}
                    {part.colorName ? ` · ${part.colorName}` : ''}
                  </p>
                  {part.notes ? (
                    <p className="truncate text-xs text-muted-foreground">{part.notes}</p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eintrag löschen"
                  onClick={() => remove(part)}
                  disabled={pending}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Noch nichts vermerkt. Trag hier ein, was beim Aufbauen fehlt – dann weißt du beim
            Nachbestellen, worum es geht.
          </p>
        )}

        <form onSubmit={add} className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Fehlteil hinzufügen</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Teilenummer" htmlFor="partNumber" className="sm:col-span-1">
              <Input id="partNumber" name="partNumber" maxLength={40} placeholder="3001" className="font-mono" />
            </Field>
            <Field label="Farbe" htmlFor="colorName">
              <Input id="colorName" name="colorName" maxLength={40} placeholder="Rot" />
            </Field>
            <Field label="Anzahl" htmlFor="quantity">
              <Input
                id="quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                defaultValue={1}
              />
            </Field>
          </div>

          <Field label="Notiz" htmlFor="part-notes" hint="Reicht auch allein, wenn du die Nummer nicht kennst.">
            <Input id="part-notes" name="notes" maxLength={300} placeholder="Dachstein vorne links" />
          </Field>

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
            Hinzufügen
          </Button>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fertig
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
