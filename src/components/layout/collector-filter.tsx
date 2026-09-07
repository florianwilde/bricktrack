'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from 'cn';
import { collectorDotClass } from '@/lib/collector-colors';

export type CollectorOption = { id: string; name: string; color: string };

/**
 * Switches the view between collectors.
 *
 * Rendered only when there is more than one - with a single collector the
 * whole question does not exist, and the app should not ask it. The choice
 * lives in the URL (`?sammler=`), so a filtered view stays shareable and the
 * back button behaves.
 */
export function CollectorFilter({
  collectors,
  allLabel = 'Alle',
}: {
  collectors: CollectorOption[];
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (collectors.length < 2) return null;

  const current = searchParams.get('sammler') ?? '';

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('sammler', id);
    else params.delete('sammler');
    params.delete('seite');

    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  const options = [{ id: '', name: allLabel, color: 'slate' }, ...collectors];

  return (
    <nav
      aria-label="Sammler"
      className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
    >
      {options.map((option) => {
        const active = current === option.id;
        return (
          <button
            key={option.id || 'alle'}
            type="button"
            aria-pressed={active}
            onClick={() => select(option.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.id ? (
              <span
                className={cn('size-2 rounded-full', collectorDotClass(option.color))}
                aria-hidden
              />
            ) : null}
            {option.name}
          </button>
        );
      })}
    </nav>
  );
}
