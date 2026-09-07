'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';
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

export type CrudItem = {
  id: string;
  title: string;
  subtitle?: string | null;
};

type Props<T extends CrudItem> = {
  items: T[];
  emptyText: string;
  createLabel: string;
  dialogTitle: (item: T | null) => string;
  dialogDescription?: string;
  /** Form fields for the create/edit dialog. `item` is null when creating. */
  renderFields: (item: T | null) => React.ReactNode;
  onCreate: (input: Record<string, unknown>) => Promise<ActionResult>;
  onUpdate: (id: string, input: Record<string, unknown>) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  deleteWarning: (item: T) => string;
};

/**
 * Shared list + create/edit/delete UI for the small master-data tables
 * (manufacturers, themes, locations). They differ only in their form fields.
 */
export function CrudSection<T extends CrudItem>({
  items,
  emptyText,
  createLabel,
  dialogTitle,
  dialogDescription,
  renderFields,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
}: Props<T>) {
  const router = useRouter();
  const [editing, setEditing] = useState<T | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setDialogOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = Object.fromEntries(formData.entries());
    const current = editing;

    startTransition(async () => {
      const result = current ? await onUpdate(current.id, input) : await onCreate(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(current ? 'Gespeichert.' : 'Angelegt.');
      setDialogOpen(false);
      setEditing(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    const item = deleting;
    if (!item) return;

    startTransition(async () => {
      const result = await onDelete(item.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleting(null);
        return;
      }
      toast.success('Gelöscht.');
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full sm:w-auto" onClick={openCreate}>
        <Plus />
        {createLabel}
      </Button>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.title} bearbeiten`}
                onClick={() => openEdit(item)}
                disabled={pending}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.title} löschen`}
                onClick={() => setDeleting(item)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle(editing)}</DialogTitle>
            {dialogDescription ? (
              <DialogDescription>{dialogDescription}</DialogDescription>
            ) : null}
          </DialogHeader>
          {/* Remounting on change resets defaultValue-based fields. */}
          <form
            key={editing?.id ?? 'new'}
            id="crud-form"
            onSubmit={submit}
            className="space-y-4"
          >
            {renderFields(editing)}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="crud-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? deleteWarning(deleting) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
