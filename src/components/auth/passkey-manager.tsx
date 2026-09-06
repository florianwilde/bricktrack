'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Fingerprint, KeyRound, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deletePasskeyAction, renamePasskeyAction } from '@/app/(app)/konto/actions';
import { authClient } from '@/lib/auth-client';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type PasskeyRow = {
  id: string;
  name: string | null;
  createdAt: Date | null;
};

export function PasskeyManager({ passkeys }: { passkeys: PasskeyRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renaming, setRenaming] = useState<PasskeyRow | null>(null);
  const [pending, startTransition] = useTransition();

  async function addPasskey() {
    setAdding(true);
    const result = await authClient.passkey.addPasskey({
      name: name.trim() || defaultPasskeyName(),
    });
    setAdding(false);

    if (result?.error) {
      toast.error(result.error.message ?? 'Der Passkey konnte nicht angelegt werden.');
      return;
    }

    toast.success('Passkey gespeichert.');
    setName('');
    setDialogOpen(false);
    router.refresh();
  }

  function remove(passkey: PasskeyRow) {
    startTransition(async () => {
      const result = await deletePasskeyAction({ id: passkey.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Passkey gelöscht.');
      router.refresh();
    });
  }

  function rename(passkey: PasskeyRow, newName: string) {
    startTransition(async () => {
      const result = await renamePasskeyAction({ id: passkey.id, name: newName });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Passkey umbenannt.');
      setRenaming(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {passkeys.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Noch kein Passkey hinterlegt. Mit einem Passkey meldest du dich per Fingerabdruck,
          Gesichtserkennung oder Geräte-PIN an – ohne Passwort.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 p-3">
              <KeyRound className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{passkey.name ?? 'Unbenannt'}</p>
                <p className="text-xs text-muted-foreground">
                  Angelegt am {formatDate(passkey.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Umbenennen"
                onClick={() => setRenaming(passkey)}
                disabled={pending}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Löschen"
                onClick={() => remove(passkey)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button size="lg" className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
        <Fingerprint />
        Passkey hinzufügen
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passkey hinzufügen</DialogTitle>
            <DialogDescription>
              Gib dem Passkey einen Namen, damit du ihn später wiedererkennst – zum Beispiel
              &bdquo;iPhone von Papa&ldquo;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="passkey-name">Name</Label>
            <Input
              id="passkey-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={defaultPasskeyName()}
              maxLength={60}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button onClick={() => void addPasskey()} disabled={adding}>
              {adding ? <Loader2 className="animate-spin" /> : <Fingerprint />}
              Jetzt anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passkey umbenennen</DialogTitle>
            <DialogDescription>
              Der Name hilft dir nur beim Wiedererkennen und ist sonst ohne Bedeutung.
            </DialogDescription>
          </DialogHeader>
          <form
            id="rename-passkey"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get('name');
              if (renaming && typeof value === 'string') rename(renaming, value);
            }}
            className="space-y-2"
          >
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              name="name"
              defaultValue={renaming?.name ?? ''}
              maxLength={60}
              required
            />
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button type="submit" form="rename-passkey" disabled={pending}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A sensible default so the list does not fill up with "Unbenannt". */
function defaultPasskeyName(): string {
  if (typeof navigator === 'undefined') return 'Mein Gerät';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android-Gerät';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows-PC';
  return 'Mein Gerät';
}
