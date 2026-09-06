'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Gift, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteSet } from '@/app/(app)/katalog/actions';
import { addSetToCollection } from '@/app/(app)/sammlung/actions';
import { addSetsToWishlist, createWishlist } from '@/app/(app)/wunschlisten/actions';
import { PRIORITY_LABELS } from '@/lib/wishlist-logic';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

const NEW_LIST = '__neu__';

export function SetActions({
  setId,
  setName,
  owned,
  wishlists,
}: {
  setId: string;
  setName: string;
  owned: boolean;
  wishlists: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetId, setTargetId] = useState(wishlists[0]?.id ?? NEW_LIST);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('2');

  function addToCollection() {
    startTransition(async () => {
      const result = await addSetToCollection(setId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Zur Sammlung hinzugefügt.');
      router.refresh();
    });
  }

  function addToWishlist() {
    startTransition(async () => {
      let wishlistId = targetId;

      if (wishlistId === NEW_LIST) {
        const created = await createWishlist({ title: newTitle, occasion: 'other' });
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        wishlistId = created.data.id;
      }

      const result = await addSetsToWishlist({ wishlistId, setIds: [setId], priority });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.data.added === 0) toast.warning(result.data.message);
      else toast.success('Auf die Wunschliste gesetzt.');

      setWishlistOpen(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteSet(setId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Set gelöscht.');
      router.push('/katalog');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={addToCollection} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Zur Sammlung hinzufügen
      </Button>

      <Button
        size="lg"
        variant="outline"
        onClick={() => setWishlistOpen(true)}
        disabled={pending || owned}
        title={owned ? 'Das Set ist bereits in der Sammlung.' : undefined}
      >
        <Gift />
        Auf Wunschliste
      </Button>

      <Button size="lg" variant="ghost" onClick={() => setDeleteOpen(true)} disabled={pending}>
        <Trash2 className="text-destructive" />
        Löschen
      </Button>

      {owned ? (
        <p className="w-full text-xs text-muted-foreground">
          Sets aus der Sammlung lassen sich nicht auf eine Wunschliste setzen.
        </p>
      ) : null}

      <Dialog open={wishlistOpen} onOpenChange={setWishlistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auf Wunschliste setzen</DialogTitle>
            <DialogDescription>{setName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="Wunschliste" htmlFor="single-target" required>
              <NativeSelect
                id="single-target"
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
              <Field label="Titel der neuen Liste" htmlFor="single-new-title" required>
                <Input
                  id="single-new-title"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Weihnachten 2026"
                  maxLength={80}
                />
              </Field>
            ) : null}

            <Field label="Priorität" htmlFor="single-priority">
              <NativeSelect
                id="single-priority"
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
            <Button variant="outline" onClick={() => setWishlistOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button onClick={addToWishlist} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Gift />}
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{setName}“ wird aus dem Katalog entfernt – mit allen Sammlungseinträgen,
              Anleitungen, Fotos und Wunschlisten-Einträgen dazu. Das lässt sich nicht rückgängig
              machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
