'use client';

import { cn } from 'cn';

export type FilterTab = { value: string; label: string };

/**
 * A row of tabs for one filter: every option is visible at a glance and one
 * tap away, unlike a select that hides them behind a menu.
 *
 * Built as a radio group because picking a tab filters the list below rather
 * than switching between panels. Scrolls sideways when the options do not fit
 * on a phone. Same look as the "Für wen?" switch in the header.
 */
export function FilterTabs({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: FilterTab[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pt-0.5 pb-1.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || 'alle'}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            className={cn(
              'flex h-9 shrink-0 items-center rounded-[calc(var(--radius)*0.7)] border-[length:max(1px,var(--edge-w))] px-3 text-sm font-bold whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60',
              active
                ? 'border-edge bg-card text-card-foreground shadow-(--lift-sm)'
                : 'border-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
