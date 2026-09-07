'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createWishlist, updateWishlist } from '@/app/(app)/wunschlisten/actions';
import type { Occasion } from '@/db/types';
import { toDateInputValue } from '@/lib/format';
import { OCCASION_LABELS } from '@/lib/labels';
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
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export type WishlistFormValues = {
  id: string;
  collectorId: string | null;
  title: string;
  occasion: Occasion;
  eventDate: Date | null;
  note: string | null;
  isPublic: boolean;
  surpriseMode: boolean;
};

export function WishlistFormDialog({
  wishlist,
  collectors = [],
  open,
  onOpenChange,
}: {
  wishlist?: WishlistFormValues;
  /** Only asked about when there is more than one. */
  collectors?: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setOpen = onOpenChange;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget).entries());

    startTransition(async () => {
      if (wishlist) {
        const result = await updateWishlist(wishlist.id, input);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success('Wunschliste gespeichert.');
        setOpen(false);
        router.refresh();
        return;
      }

      const result = await createWishlist(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Wunschliste angelegt.');
      setOpen(false);
      router.push(`/wunschlisten/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{wishlist ? 'Wunschliste bearbeiten' : 'Neue Wunschliste'}</DialogTitle>
            <DialogDescription>
              Der Anlass und das Datum erscheinen auch auf der geteilten Ansicht.
            </DialogDescription>
          </DialogHeader>

          <form id="wishlist-form" onSubmit={submit} className="space-y-4">
            <Field label="Titel" htmlFor="title" required>
              <Input
                id="title"
                name="title"
                defaultValue={wishlist?.title ?? ''}
                required
                maxLength={80}
                placeholder="Weihnachten 2026"
              />
            </Field>

            {collectors.length > 1 ? (
              <Field
                label="Für wen"
                htmlFor="collectorId"
                hint="Bestimmt, wessen Sammlung als „hat er schon“ zählt."
              >
                <NativeSelect
                  id="collectorId"
                  name="collectorId"
                  defaultValue={wishlist?.collectorId ?? 'none'}
                >
                  <option value="none">– alle zusammen –</option>
                  {collectors.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Anlass" htmlFor="occasion">
                <NativeSelect
                  id="occasion"
                  name="occasion"
                  defaultValue={wishlist?.occasion ?? 'other'}
                >
                  {Object.entries(OCCASION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Termin" htmlFor="eventDate">
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={toDateInputValue(wishlist?.eventDate)}
                />
              </Field>
            </div>

            <Field
              label="Hinweis an die Schenkenden"
              htmlFor="note"
              hint="Steht oben auf der geteilten Liste."
            >
              <Textarea
                id="note"
                name="note"
                defaultValue={wishlist?.note ?? ''}
                rows={3}
                placeholder="Bitte keine Doppelungen."
              />
            </Field>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <label className="flex items-start gap-3">
                <Checkbox name="isPublic" value="on" defaultChecked={wishlist?.isPublic ?? true} />
                <span>
                  <Label className="font-medium">Über Link teilbar</Label>
                  <span className="block text-xs text-muted-foreground">
                    Nur wer den Link kennt, sieht die Liste. Ohne diesen Haken ist der Link tot.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <Checkbox
                  name="surpriseMode"
                  value="on"
                  defaultChecked={wishlist?.surpriseMode ?? false}
                />
                <span>
                  <Label className="font-medium">Überraschungsmodus</Label>
                  <span className="block text-xs text-muted-foreground">
                    Du siehst dann nur, dass etwas reserviert ist – nicht von wem.
                  </span>
                </span>
              </label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="wishlist-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              {wishlist ? 'Speichern' : 'Anlegen'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Button plus dialog, for the wishlist overview page. */
export function NewWishlistButton({
  collectors = [],
}: {
  collectors?: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus />
        Neue Wunschliste
      </Button>
      <WishlistFormDialog collectors={collectors} open={open} onOpenChange={setOpen} />
    </>
  );
}
