'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { CheckCheck, Gift, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { addSetsToWishlist, createWishlist } from '@/app/(app)/wunschlisten/actions';
import type { CatalogRow } from '@/lib/queries/catalog';
import { PRIORITY_LABELS } from '@/lib/wishlist-logic';
import { SetCard, SetCardContent } from './set-card';
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
import { NativeSelect } from '@/components/ui/native-select';

const LONG_PRESS_MS = 450;
const NEW_LIST = '__neu__';

export type WishlistTarget = { id: string; title: string };

type Props = {
  sets: CatalogRow[];
  wishlists: WishlistTarget[];
  /** Preselected target, used by the embedded view on a wishlist page. */
  defaultWishlistId?: string;
  emptyState?: React.ReactNode;
};

/**
 * The catalog grid with its selection mode.
 *
 * On a phone a long press starts the selection, afterwards a tap toggles.
 * On a desktop the "Auswählen" button does the same job. Sets that are already
 * in the collection cannot be selected - they do not belong on a wishlist.
 */
export function CatalogGrid({ sets, wishlists, defaultWishlistId, emptyState }: Props) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetId, setTargetId] = useState(defaultWishlistId ?? wishlists[0]?.id ?? NEW_LIST);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('2');
  const [pending, startTransition] = useTransition();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const selectable = sets.filter((item) => item.ownedCopies === 0);

  function toggle(setId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  }

  function startLongPress(item: CatalogRow) {
    if (item.ownedCopies > 0) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelecting(true);
      toggle(item.id);
      // A short buzz confirms the mode switch where the device supports it.
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function endSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  function submit() {
    const setIds = [...selected];
    if (setIds.length === 0) return;

    startTransition(async () => {
      let wishlistId = targetId;

      if (wishlistId === NEW_LIST) {
        // isPublic: a list created on the fly is meant to be shared right away.
        const created = await createWishlist({
          title: newTitle,
          occasion: 'other',
          isPublic: 'on',
        });
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        wishlistId = created.data.id;
      }

      const result = await addSetsToWishlist({ wishlistId, setIds, priority });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.data.added === 0) toast.warning(result.data.message);
      else toast.success(result.data.message);

      setDialogOpen(false);
      endSelection();
      router.refresh();
    });
  }

  if (sets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyState ?? 'Keine Sets gefunden. Passe die Filter an oder leg ein neues Set an.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selecting
            ? 'Tippe die Sets an, die auf die Wunschliste sollen.'
            : 'Tipp: Kachel lange drücken, um mehrere Sets auszuwählen.'}
        </p>
        {selecting ? (
          <Button variant="ghost" size="sm" onClick={endSelection}>
            <X />
            Abbrechen
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelecting(true)}
            disabled={selectable.length === 0}
          >
            <CheckCheck />
            Auswählen
          </Button>
        )}
      </div>

      <div
        className={cn(
          'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
          // Room for the fixed action bar, so the last row stays reachable.
          selecting && 'pb-20',
        )}
      >
        {sets.map((item) => {
          const owned = item.ownedCopies > 0;
          const isSelected = selected.has(item.id);

          if (!selecting) {
            return (
              <div
                key={item.id}
                onPointerDown={() => startLongPress(item)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(event) => {
                  // The long press must not open the browser context menu.
                  if (longPressFired.current) event.preventDefault();
                }}
                onClickCapture={(event) => {
                  if (longPressFired.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    longPressFired.current = false;
                  }
                }}
              >
                <SetCard set={item} className="block h-full" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              disabled={owned}
              aria-pressed={isSelected}
              onClick={() => toggle(item.id)}
              title={owned ? 'Schon in der Sammlung' : undefined}
              className={cn(
                'relative rounded-xl text-left outline-none transition-opacity',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
                owned && 'cursor-not-allowed opacity-50',
                isSelected && '[&>div]:border-primary [&>div]:ring-2 [&>div]:ring-primary/40',
              )}
            >
              <SetCardContent set={item} />
              {!owned ? (
                <span className="absolute top-2 right-2 rounded-md bg-background/90 p-1 shadow-sm">
                  <Checkbox checked={isSelected} tabIndex={-1} aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {selecting ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="text-sm font-medium">
              {selected.size} ausgewählt
            </span>
            <div className="flex-1" />
            <Button
              size="lg"
              disabled={selected.size === 0}
              onClick={() => setDialogOpen(true)}
            >
              <Gift />
              Zur Wunschliste hinzufügen
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected.size === 1
                ? '1 Set auf die Wunschliste'
                : `${selected.size} Sets auf die Wunschliste`}
            </DialogTitle>
            <DialogDescription>
              Sets, die schon auf der Liste oder bereits in der Sammlung sind, werden
              übersprungen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Wunschliste" htmlFor="target-wishlist" required>
              <NativeSelect
                id="target-wishlist"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {wishlists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
                <option value={NEW_LIST}>+ Neue Wunschliste anlegen</option>
              </NativeSelect>
            </Field>

            {targetId === NEW_LIST ? (
              <Field label="Titel der neuen Liste" htmlFor="new-title" required>
                <Input
                  id="new-title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Weihnachten 2026"
                  maxLength={80}
                />
              </Field>
            ) : null}

            <Field
              label="Priorität"
              htmlFor="priority"
              hint="Gilt für alle ausgewählten Sets und lässt sich später je Eintrag ändern."
            >
              <NativeSelect
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Gift />}
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
