import Link from 'next/link';
import { Check, Gift } from 'lucide-react';
import { cn } from 'cn';
import { SetPlaceholder } from '@/components/brick/set-placeholder';
import { Studs } from '@/components/brick/studs';
import type { CatalogRow } from '@/lib/queries/catalog';
import { formatEuro } from '@/lib/money';
import { setImageSrc } from '@/lib/images';
import { Badge } from '@/components/ui/badge';

/**
 * One set in the catalog grid.
 *
 * Rendered as a plain block so it can be used both as a link (browsing) and
 * inside a selection wrapper (bulk add to a wishlist).
 */
export function SetCardContent({ set }: { set: CatalogRow }) {
  const image = setImageSrc(set);
  const owned = set.ownedCopies > 0;

  return (
    <div className="relative h-full">
      <Studs count={3} />
      <div className="brick flex h-full flex-col overflow-hidden rounded-xl bg-card transition-colors">
        <div className="relative aspect-square border-b-[length:var(--edge-w)] border-edge bg-muted">
          {image ? (
            // Plain img: images are either local files or a URL the user entered,
            // and the optimizer must never fetch arbitrary remote hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-contain p-2"
            />
          ) : (
            <SetPlaceholder setNumber={set.setNumber} manufacturerName={set.manufacturerName} />
          )}

          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {owned ? (
              <Badge className="gap-1 bg-owned text-owned-foreground">
                <Check className="size-3" aria-hidden />
                {set.ownedCopies > 1 ? `${set.ownedCopies}× vorhanden` : 'Vorhanden'}
              </Badge>
            ) : null}
            {set.wishlistCount > 0 ? (
              <Badge className="gap-1">
                <Gift className="size-3" aria-hidden />
                Auf Wunschliste
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono">
              {set.setNumber}
            </Badge>
            <span className="truncate">{set.manufacturerName}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-snug font-medium">{set.name}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span className="truncate">
              {[set.themeName, set.year].filter(Boolean).join(' · ')}
            </span>
            {set.retailPriceCents !== null ? (
              <span className="shrink-0 font-medium text-foreground">
                {formatEuro(set.retailPriceCents)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetCard({ set, className }: { set: CatalogRow; className?: string }) {
  return (
    <Link
      href={`/katalog/${set.id}`}
      className={cn(
        'rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <SetCardContent set={set} />
    </Link>
  );
}
