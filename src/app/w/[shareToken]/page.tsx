import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Blocks, CalendarDays, Gift } from 'lucide-react';
import { PublicWishlist, type PublicItem } from '@/components/wunschlisten/public-wishlist';
import { Badge } from '@/components/ui/badge';
import { formatDate, pluralize } from '@/lib/format';
import { occasionLabel } from '@/lib/labels';
import { getWishlistByShareToken, listWishlistItems } from '@/lib/queries/wishlists';

type Props = { params: Promise<{ shareToken: string }> };

/**
 * The public face of a wishlist.
 *
 * Reachable with the share token alone, and it exposes nothing beyond the
 * wishlist itself - no owner name, no collection, no other lists. Search
 * engines are kept out; this is meant to be shared, not found.
 */
export const metadata: Metadata = {
  title: 'Wunschliste',
  robots: { index: false, follow: false },
};

export default async function PublicWishlistPage({ params }: Props) {
  const { shareToken } = await params;

  const list = getWishlistByShareToken(shareToken);
  if (!list || !list.isPublic) notFound();

  const rows = listWishlistItems(list.id, list.collectorId);

  // Fulfilled wishes are gone from the public view: the present is already
  // under the tree, no reason to let someone buy it twice.
  const open = rows.filter((row) => row.fulfilledAt === null);

  const items: PublicItem[] = open.map((row) => ({
    id: row.id,
    setNumber: row.setNumber,
    setName: row.setName,
    year: row.year,
    pieceCount: row.pieceCount,
    imageUrl: row.imageUrl,
    imagePath: row.imagePath,
    retailPriceCents: row.retailPriceCents,
    manufacturerName: row.manufacturerName,
    manufacturerWebsite: row.manufacturerWebsite,
    themeName: row.themeName,
    priority: row.priority,
    note: row.note,
    isReserved: row.reservedAt !== null,
    reservedByName: row.reservedByName,
  }));

  const openCount = items.filter((item) => !item.isReserved).length;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Blocks className="size-4 text-primary" aria-hidden />
          Bricktrack
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{list.title}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Gift className="size-3" aria-hidden />
            {occasionLabel(list.occasion)}
          </Badge>
          {list.eventDate ? (
            <Badge variant="outline" className="gap-1">
              <CalendarDays className="size-3" aria-hidden />
              {formatDate(list.eventDate)}
            </Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {pluralize(openCount, 'Wunsch noch offen', 'Wünsche noch offen')}
          </span>
        </div>

        {list.note ? (
          <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{list.note}</p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Klick auf „Das schenke ich“, damit niemand dasselbe doppelt kauft. Eine Anmeldung
          brauchst du dafür nicht.
        </p>
      </header>

      <main className="py-6">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Auf dieser Liste steht gerade nichts.
          </p>
        ) : (
          <PublicWishlist shareToken={shareToken} items={items} />
        )}
      </main>
    </div>
  );
}
