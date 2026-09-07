'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Copy, Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createInviteAction,
  deleteInviteAction,
} from '@/app/(app)/verwaltung/einladungen/actions';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export type InviteListRow = {
  id: string;
  email: string | null;
  role: 'admin' | 'member';
  expiresAt: Date;
  usedAt: Date | null;
  usedByName: string | null;
  state: 'open' | 'used' | 'expired';
};

export function InviteList({ invites }: { invites: InviteListRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget).entries());

    startTransition(async () => {
      const result = await createInviteAction(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreateOpen(false);
      setLink(`${window.location.origin}/einladung/${result.data.token}`);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteInviteAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Einladung gelöscht.');
      router.refresh();
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link kopiert.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren hat nicht geklappt. Markiere den Link und kopiere ihn von Hand.');
    }
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
        <Plus />
        Einladung erstellen
      </Button>

      {invites.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch keine Einladung. Damit bekommt zum Beispiel der zweite Elternteil ein eigenes
          Konto – ohne dass die Registrierung für alle offen steht.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {invites.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <Mail className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.email ?? 'Für beliebige Adresse'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.state === 'used'
                    ? `Verwendet von ${item.usedByName ?? 'jemandem'} am ${formatDate(item.usedAt)}`
                    : `Gültig bis ${formatDate(item.expiresAt)}`}
                </p>
              </div>

              <Badge
                variant={
                  item.state === 'open' ? 'default' : item.state === 'used' ? 'secondary' : 'outline'
                }
              >
                {item.state === 'open' ? 'Offen' : item.state === 'used' ? 'Verwendet' : 'Abgelaufen'}
              </Badge>
              {item.role === 'admin' ? <Badge variant="outline">Admin</Badge> : null}

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Einladung löschen"
                onClick={() => remove(item.id)}
                disabled={pending}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einladung erstellen</DialogTitle>
            <DialogDescription>
              Du bekommst einen Link, den du weitergibst. Er funktioniert genau einmal.
            </DialogDescription>
          </DialogHeader>

          <form id="invite-form" onSubmit={submit} className="space-y-4">
            <Field
              label="E-Mail"
              htmlFor="invite-email"
              hint="Optional. Wenn gesetzt, funktioniert der Link nur mit dieser Adresse."
            >
              <Input id="invite-email" name="email" type="email" inputMode="email" maxLength={160} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rolle" htmlFor="invite-role">
                <NativeSelect id="invite-role" name="role" defaultValue="member">
                  <option value="member">Mitglied</option>
                  <option value="admin">Administrator</option>
                </NativeSelect>
              </Field>

              <Field label="Gültig für" htmlFor="invite-days">
                <NativeSelect id="invite-days" name="validDays" defaultValue="14">
                  <option value="1">1 Tag</option>
                  <option value="7">7 Tage</option>
                  <option value="14">14 Tage</option>
                  <option value="30">30 Tage</option>
                </NativeSelect>
              </Field>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="submit" form="invite-form" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einladungslink</DialogTitle>
            <DialogDescription>
              Der Link wird nur jetzt angezeigt – in der Datenbank liegt nur sein Hash. Kopiere
              ihn und schick ihn weiter.
            </DialogDescription>
          </DialogHeader>

          <Input
            readOnly
            aria-label="Einladungslink"
            value={link ?? ''}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />

          <DialogFooter>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check className="text-emerald-600" /> : <Copy />}
              Link kopieren
            </Button>
            <Button onClick={() => setLink(null)}>Fertig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
