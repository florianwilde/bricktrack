'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addSetPhoto, deletePhoto } from '@/app/(app)/katalog/actions';
import { fileUrl } from '@/lib/images';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type PhotoRow = {
  id: string;
  filePath: string;
  thumbnailPath: string | null;
  caption: string | null;
};

export function PhotosSection({ setId, photos }: { setId: string; photos: PhotoRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await addSetPhoto(setId, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Foto gespeichert.');
      setAddOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deletePhoto(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Foto gelöscht.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((item) => (
            <li key={item.id} className="group relative">
              <a
                href={fileUrl(item.filePath)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(item.thumbnailPath ?? item.filePath)}
                  alt={item.caption ?? ''}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </a>
              <Button
                variant="secondary"
                size="icon-xs"
                aria-label="Foto löschen"
                className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => remove(item.id)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Noch keine eigenen Fotos – zum Beispiel vom fertig gebauten Modell.
        </p>
      )}

      <Button variant="outline" onClick={() => setAddOpen(true)}>
        <Camera />
        Foto hinzufügen
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto hinzufügen</DialogTitle>
          </DialogHeader>
          <form id="photo-form" onSubmit={submit} className="space-y-4">
            <Field label="Bild" htmlFor="photo-file" required>
              {/* capture lets the phone open the camera directly. */}
              <Input
                id="photo-file"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required
              />
            </Field>
            <Field label="Bildunterschrift" htmlFor="caption">
              <Input id="caption" name="caption" maxLength={160} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="photo-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
