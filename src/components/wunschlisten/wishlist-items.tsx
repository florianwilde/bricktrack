'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Check, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  removeWishlistItem,
  reorderWishlistItems,
  updateWishlistItem,
} from '@/app/(app)/wunschlisten/actions';
import { formatDate } from '@/lib/format';
import { setImageSrc } from '@/lib/images';
import { formatEuro } from '@/lib/money';
import type { WishlistItemRow } from '@/lib/queries/wishlists';
import { PRIORITY_LABELS, priorityLabel } from '@/lib/wishlist-logic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

export function WishlistItems({
  wishlistId,
  items,
  surpriseMode,
}: {
  wishlistId: string;
  items: WishlistItemRow[];
  surpriseMode: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState(items);

  // Keep the local order in sync when the server sends a new list.
  if (items.map((item) => item.id).join() !== order.map((item) => item.id).join()) {
    setOrder(items);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    setOrder(next);

    startTransition(async () => {
      const result = await reorderWishlistItems(
        wishlistId,
        next.map((item) => item.id),
      );
      if (!result.ok) {
        toast.error(result.error);
        setOrder(items);
        return;
      }
      router.refresh();
    });
  }

  function setPriority(itemId: string, priority: string, note: string | null) {
    startTransition(async () => {
      const result = await updateWishlistItem(itemId, { priority, note: note ?? '' });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      const result = await removeWishlistItem(itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Vom Wunschzettel entfernt.');
      router.refresh();
    });
  }

  if (order.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Noch nichts drauf. Nimm unten Sets aus der Liste der fehlenden Sets dazu.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {order.map((item, index) => {
        const image = setImageSrc(item);

        return (
          <li key={item.id} className="flex items-start gap-3 p-3">
            <div className="flex flex-col gap-1 pt-1">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Nach oben"
                onClick={() => move(index, -1)}
                disabled={pending || index === 0}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Nach unten"
                onClick={() => move(index, 1)}
                disabled={pending || index === order.length - 1}
              >
                <ArrowDown />
              </Button>
            </div>

            <Link
              href={`/katalog/${item.setId}`}
              className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" loading="lazy" className="size-full object-contain" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-5" aria-hidden />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <Link href={`/katalog/${item.setId}`} className="text-sm font-medium hover:underline">
                  {item.setName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[item.setNumber, item.manufacturerName, formatEuro(item.retailPriceCents)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  aria-label={`Priorität für ${item.setName}`}
                  className="h-9 w-auto text-sm"
                  value={String(item.priority)}
                  onChange={(event) => setPriority(item.id, event.target.value, item.note)}
                  disabled={pending}
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>

                {item.fulfilledAt ? (
                  <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                    <Check className="size-3" aria-hidden />
                    Erfüllt – schon in der Sammlung
                  </Badge>
                ) : item.reservedAt ? (
                  <Badge variant="secondary">
                    {surpriseMode
                      ? 'Reserviert'
                      : `Reserviert von ${item.reservedByName ?? 'jemandem'}`}
                    {` · ${formatDate(item.reservedAt)}`}
                  </Badge>
                ) : (
                  <Badge variant="outline">{priorityLabel(item.priority)} · noch offen</Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Entfernen"
              onClick={() => remove(item.id)}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
