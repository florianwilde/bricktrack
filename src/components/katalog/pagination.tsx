'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  if (lastPage <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete('seite');
    else params.set('seite', String(target));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Seiten">
      <Button asChild variant="outline" disabled={page <= 1}>
        <Link href={hrefFor(page - 1)} aria-disabled={page <= 1} className={page <= 1 ? 'pointer-events-none opacity-50' : ''}>
          <ChevronLeft />
          Zurück
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        Seite {page} von {lastPage}
      </span>
      <Button asChild variant="outline" disabled={page >= lastPage}>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={page >= lastPage}
          className={page >= lastPage ? 'pointer-events-none opacity-50' : ''}
        >
          Weiter
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
