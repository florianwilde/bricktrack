'use client';

import { useEffect, useState, useTransition } from 'react';
import { Check, ExternalLink, Gift, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { cancelReservation, reserveItem } from '@/app/w/actions';
import { setImageSrc } from '@/lib/images';
import { SetPlaceholder } from '@/components/brick/set-placeholder';
import { Studs } from '@/components/brick/studs';
import { formatEuro } from '@/lib/money';
import { priorityLabel } from '@/lib/wishlist-logic';
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

export type PublicItem = {
  id: string;
  setNumber: string;
  setName: string;
  year: number | null;
  pieceCount: number | null;
  imageUrl: string | null;
  imagePath: string | null;
  retailPriceCents: number | null;
  manufacturerName: string;
  manufacturerWebsite: string | null;
  themeName: string | null;
  priority: number;
  note: string | null;
  isReserved: boolean;
  reservedByName: string | null;
};

/** Cancel tokens live in the visitor's browser - they have no account. */
const STORAGE_KEY = 'bricktrack.reservations';

function readTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeTokens(tokens: Record<string, string>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* private mode - the link shown after reserving is the fallback */
  }
}

export function PublicWishlist({
  shareToken,
  items,
}: {
  shareToken: string;
  items: PublicItem[];
}) {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [reserving, setReserving] = useState<PublicItem | null>(null);
  const [name, setName] = useState('');
  const [cancelLink, setCancelLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTokens(readTokens());
    // Remember the name so the second gift does not need it typed again.
    setName(window.localStorage.getItem('bricktrack.name') ?? '');
  }, []);

  function reserve() {
    const item = reserving;
    if (!item) return;

    startTransition(async () => {
      const result = await reserveItem(shareToken, { itemId: item.id, name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const next = { ...tokens, [item.id]: result.data.cancelToken };
      setTokens(next);
      writeTokens(next);
      try {
        window.localStorage.setItem('bricktrack.name', name.trim());
      } catch {
        /* ignore */
      }

      setCancelLink(
        `${window.location.origin}/w/${shareToken}/storno/${item.id}/${result.data.cancelToken}`,
      );
      setReserving(null);
      toast.success('Danke! Der Wunsch ist für dich reserviert.');
    });
  }

  function undo(item: PublicItem) {
    const token = tokens[item.id];
    if (!token) return;

    startTransition(async () => {
      const result = await cancelReservation(shareToken, item.id, token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const next = { ...tokens };
      delete next[item.id];
      setTokens(next);
      writeTokens(next);
      toast.success('Reservierung aufgehoben.');
    });
  }

  return (
    <div className="space-y-5 pt-2">
      {items.map((item) => {
        const image = setImageSrc(item);
        const mine = Boolean(tokens[item.id]);

        return (
          <article key={item.id} className="relative">
            {/* Studs turn green once someone has taken the wish. */}
            <Studs count={3} studClassName={mine || item.isReserved ? 'bg-owned' : undefined} />
            <div className="brick flex gap-3 rounded-xl bg-card p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg border-[length:max(1px,var(--edge-w))] border-edge bg-muted sm:size-28">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" loading="lazy" className="size-full object-contain" />
                ) : (
                  <SetPlaceholder
                    setNumber={item.setNumber}
                    manufacturerName={item.manufacturerName}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.setNumber}
                    </Badge>
                    <Badge variant="secondary">{item.manufacturerName}</Badge>
                    {item.priority === 1 ? <Badge>{priorityLabel(1)}</Badge> : null}
                  </div>
                  <h2 className="mt-1 font-medium">{item.setName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {[
                      item.themeName,
                      item.year,
                      item.pieceCount ? `${item.pieceCount} Teile` : null,
                      item.retailPriceCents !== null ? formatEuro(item.retailPriceCents) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {item.note ? <p className="mt-1 text-sm">{item.note}</p> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {mine ? (
                    <>
                      <Badge className="gap-1 bg-owned text-owned-foreground">
                        <Check className="size-3" aria-hidden />
                        Das schenkst du
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => undo(item)} disabled={pending}>
                        <Undo2 />
                        Doch nicht
                      </Button>
                    </>
                  ) : item.isReserved ? (
                    <Badge variant="secondary">
                      {item.reservedByName
                        ? `Übernimmt ${item.reservedByName}`
                        : 'Schon reserviert'}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setReserving(item);
                        setCancelLink(null);
                      }}
                      disabled={pending}
                    >
                      <Gift />
                      Das schenke ich
                    </Button>
                  )}

                  {item.manufacturerWebsite ? (
                    <Button asChild variant="link" size="sm" className="px-0">
                      <a href={item.manufacturerWebsite} target="_blank" rel="noreferrer noopener">
                        Zum Shop
                        <ExternalLink />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}

      <Dialog open={reserving !== null} onOpenChange={(open) => !open && setReserving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Das schenke ich</DialogTitle>
            <DialogDescription>
              Damit sieht jeder andere, dass dieser Wunsch schon vergeben ist. Dein Name ist nur
              für die Familie sichtbar.
            </DialogDescription>
          </DialogHeader>

          <Field label="Dein Name" htmlFor="reserver-name" required>
            <Input
              id="reserver-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tante Anne"
              maxLength={60}
              autoFocus
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReserving(null)} disabled={pending}>
              Abbrechen
            </Button>
            <Button onClick={reserve} disabled={pending || name.trim().length < 2}>
              {pending ? <Loader2 className="animate-spin" /> : <Gift />}
              Reservieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelLink !== null} onOpenChange={(open) => !open && setCancelLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservierung gespeichert</DialogTitle>
            <DialogDescription>
              Merke dir diesen Link, falls du die Reservierung später von einem anderen Gerät
              aufheben willst. Auf diesem Gerät geht es auch ohne.
            </DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={cancelLink ?? ''}
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (cancelLink) void navigator.clipboard.writeText(cancelLink);
                toast.success('Link kopiert.');
              }}
            >
              Link kopieren
            </Button>
            <Button onClick={() => setCancelLink(null)}>Alles klar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
