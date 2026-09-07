'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Link2Off, RefreshCw, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { rotateShareToken } from '@/app/(app)/wunschlisten/actions';
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
import { Input } from '@/components/ui/input';

export function ShareCard({
  wishlistId,
  shareToken,
  isPublic,
  title,
}: {
  wishlistId: string;
  shareToken: string;
  isPublic: boolean;
  title: string;
}) {
  const [token, setToken] = useState(shareToken);
  const [copied, setCopied] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Built in the browser so the link always matches the host actually used.
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/w/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link kopiert.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren hat nicht geklappt. Markiere den Link und kopiere ihn von Hand.');
    }
  }

  async function share() {
    if (!navigator.share) {
      void copy();
      return;
    }
    try {
      await navigator.share({ title, url });
    } catch {
      /* the user cancelled the share sheet */
    }
  }

  function rotate() {
    startTransition(async () => {
      const result = await rotateShareToken(wishlistId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setToken(result.data.token);
      setRotateOpen(false);
      toast.success('Neuer Link erzeugt. Der alte funktioniert nicht mehr.');
    });
  }

  if (!isPublic) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        <Link2Off className="size-4 shrink-0" aria-hidden />
        Das Teilen ist für diese Liste ausgeschaltet. Aktiviere es beim Bearbeiten der Liste.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Link zum Teilen</p>
      <div className="flex gap-2">
        <Input
          readOnly
          aria-label="Link zum Teilen"
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="font-mono text-xs"
        />
        <Button variant="outline" size="icon" onClick={copy} aria-label="Link kopieren">
          {copied ? <Check className="text-emerald-600" /> : <Copy />}
        </Button>
        <Button variant="outline" size="icon" onClick={share} aria-label="Link teilen">
          <Share2 />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Wer den Link hat, sieht die Liste – ohne Anmeldung. Sonst wird nichts preisgegeben.
      </p>
      <Button variant="ghost" size="sm" onClick={() => setRotateOpen(true)} disabled={pending}>
        <RefreshCw />
        Neuen Link erzeugen
      </Button>

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Neuen Link erzeugen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der bisherige Link funktioniert danach nicht mehr. Bereits abgegebene
              Reservierungen bleiben erhalten, aber die Storno-Links der Schenkenden werden
              ungültig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={rotate}>Neuen Link erzeugen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
