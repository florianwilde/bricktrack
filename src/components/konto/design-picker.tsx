'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
import { setDesignAction } from '@/app/(app)/konto/actions';
import { DESIGN_INFO, DESIGNS, type Design } from '@/lib/design';

/** Switches the look right away and stores it in the cookie in the background. */
function applyDesign(design: Design) {
  const root = document.documentElement;
  root.dataset.design = design;
  root.classList.toggle('dark', DESIGN_INFO[design].dark);
}

export function DesignPicker({ current }: { current: Design }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Design>(current);
  const [, startTransition] = useTransition();

  function choose(design: Design) {
    const previous = selected;
    setSelected(design);
    applyDesign(design);

    startTransition(async () => {
      const result = await setDesignAction({ design });
      if (!result.ok) {
        setSelected(previous);
        applyDesign(previous);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <fieldset>
      <legend className="sr-only">Design</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {DESIGNS.map((design) => {
          const info = DESIGN_INFO[design];
          const active = design === selected;
          return (
            <label
              key={design}
              className={cn(
                'relative flex cursor-pointer items-center gap-3 rounded-lg border-[length:max(1px,var(--edge-w))] p-3 transition-colors',
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                active ? 'border-primary bg-accent' : 'border-border hover:bg-muted/60',
              )}
            >
              <input
                type="radio"
                name="design"
                value={design}
                checked={active}
                onChange={() => choose(design)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="grid size-12 shrink-0 grid-cols-2 overflow-hidden rounded-md border border-black/15"
              >
                {info.swatch.map((color, index) => (
                  <span key={index} style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {info.label}
                  {design === 'klemmbaustein' ? (
                    <span className="font-normal text-muted-foreground"> · Standard</span>
                  ) : null}
                </span>
                <span className="block text-xs text-muted-foreground">{info.description}</span>
              </span>
              {active ? <Check className="size-5 shrink-0 text-primary" aria-hidden /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
