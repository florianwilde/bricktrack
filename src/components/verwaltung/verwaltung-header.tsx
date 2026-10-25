'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { MORE_ITEMS } from '@/components/layout/more-items';

/** Title of a master-data page, with the way back to "Mehr". */
export function VerwaltungHeader() {
  const pathname = usePathname();
  const item = MORE_ITEMS.find((entry) => entry.href === pathname);

  return (
    <div className="space-y-2">
      <Link
        href="/mehr"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Mehr
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{item?.label ?? 'Verwaltung'}</h1>
        {item ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
      </div>
    </div>
  );
}
