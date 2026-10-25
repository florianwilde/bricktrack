'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { chooseCollectorAction } from '@/app/(app)/collector-actions';
import { collectorDotClass } from '@/lib/collector-colors';

export type CollectorOption = { id: string; name: string; color: string };

/**
 * "Für wen?" in the header: picks the child the whole app is looking at.
 *
 * Only rendered with more than one collector - with a single one the question
 * does not exist. The choice is remembered per device; a `?sammler=` in the
 * URL (a shared link) takes precedence and is shown as active.
 */
export function CollectorSwitch({
  collectors,
  storedId,
}: {
  collectors: CollectorOption[];
  storedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const fromUrl = searchParams.get('sammler');
  const current = fromUrl === 'alle' ? '' : (fromUrl ?? storedId ?? '');

  function select(id: string) {
    startTransition(async () => {
      const result = await chooseCollectorAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // The header choice replaces a collector that came in via the URL.
      if (fromUrl !== null) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('sammler');
        params.delete('seite');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }
      router.refresh();
    });
  }

  const options = [{ id: '', name: 'Alle', color: '' }, ...collectors];

  return (
    <div role="radiogroup" aria-label="Für wen?" className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const active = current === option.id;
        return (
          <button
            key={option.id || 'alle'}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => select(option.id)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 rounded-[calc(var(--radius)*0.7)] border-[length:max(1px,var(--edge-w))] px-3 text-sm font-bold transition-colors',
              active
                ? 'border-edge bg-card text-card-foreground shadow-(--lift-sm)'
                : 'border-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-6 items-center justify-center rounded-md border-[length:var(--edge-w)] border-edge text-xs font-bold text-white',
                option.id ? collectorDotClass(option.color) : 'bg-secondary text-secondary-foreground',
              )}
            >
              {option.id ? option.name.charAt(0).toUpperCase() : '★'}
            </span>
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
