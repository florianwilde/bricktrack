import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Gift, Link2Off } from 'lucide-react';
import { NewWishlistButton } from '@/components/wunschlisten/wishlist-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, pluralize } from '@/lib/format';
import { occasionLabel } from '@/lib/labels';
import { listWishlists } from '@/lib/queries/wishlists';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Wunschlisten' };

export default async function WunschlistenPage() {
  const user = await requireUser();
  const lists = listWishlists(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wunschlisten</h1>
          <p className="text-sm text-muted-foreground">
            Zum Teilen mit Familie und Freunden – ganz ohne Konto für die anderen.
          </p>
        </div>
        <NewWishlistButton />
      </div>

      {lists.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Noch keine Wunschliste. Der schnellste Weg: im Katalog auf „Fehlt noch“ filtern,
            mehrere Sets auswählen und daraus eine Liste anlegen.
          </p>
          <Link href="/katalog?besitz=fehlt" className="text-sm underline underline-offset-4">
            Zu den fehlenden Sets
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <li key={list.id}>
              <Link href={`/wunschlisten/${list.id}`} className="group block h-full">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Gift className="size-5 text-primary" aria-hidden />
                      <CardTitle className="truncate">{list.title}</CardTitle>
                    </div>
                    <CardDescription>
                      {occasionLabel(list.occasion)}
                      {list.eventDate ? ` · ${formatDate(list.eventDate)}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{pluralize(list.itemCount, 'Wunsch', 'Wünsche')}</Badge>
                    {list.openCount > 0 ? (
                      <Badge variant="outline">{list.openCount} noch offen</Badge>
                    ) : list.itemCount > 0 ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                        Alles vergeben
                      </Badge>
                    ) : null}
                    {list.isPublic ? null : (
                      <Badge variant="outline" className="gap-1">
                        <Link2Off className="size-3" aria-hidden />
                        Link deaktiviert
                      </Badge>
                    )}
                    {list.eventDate ? (
                      <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="size-3" aria-hidden />
                        {formatDate(list.eventDate)}
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
