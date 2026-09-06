'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteWishlist } from '@/app/(app)/wunschlisten/actions';
import { WishlistFormDialog, type WishlistFormValues } from './wishlist-form-dialog';
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

export function WishlistHeaderActions({ wishlist }: { wishlist: WishlistFormValues }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteWishlist(wishlist.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Wunschliste gelöscht.');
      router.push('/wunschlisten');
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" size="icon-lg" aria-label="Bearbeiten" onClick={() => setEditOpen(true)}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Wunschliste löschen"
        onClick={() => setDeleteOpen(true)}
        disabled={pending}
      >
        <Trash2 className="text-destructive" />
      </Button>

      <WishlistFormDialog wishlist={wishlist} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wunschliste löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{wishlist.title}“ und alle Einträge darauf werden gelöscht. Der geteilte Link
              funktioniert danach nicht mehr. Die Sets selbst bleiben im Katalog.
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
