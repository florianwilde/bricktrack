import { cn } from 'cn';
import { toneIndex } from '@/lib/design';

const TONE_CLASSES: Record<number, string> = {
  1: 'bg-tone-1',
  2: 'bg-tone-2',
  3: 'bg-tone-3',
  4: 'bg-tone-4',
  5: 'bg-tone-5',
};

/**
 * Stand-in for a set without an image: the manufacturer's tone, a drawn
 * brick and the set number. Reads as intended rather than as "image broken".
 */
export function SetPlaceholder({
  setNumber,
  manufacturerName,
  size = 'md',
  className,
}: {
  setNumber: string;
  manufacturerName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tone = TONE_CLASSES[toneIndex(manufacturerName)];

  return (
    <div
      className={cn(
        'relative flex size-full items-end overflow-hidden text-tone-ink',
        size === 'sm' ? 'p-1.5' : 'p-3',
        tone,
        className,
      )}
    >
      {size !== 'sm' ? (
        <svg
          viewBox="0 0 70 44"
          aria-hidden
          className={cn(
            'absolute opacity-40',
            size === 'lg' ? 'top-[18%] right-[12%] w-2/5' : 'top-3 right-3 w-1/3',
          )}
        >
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="12" y="2" width="16" height="10" rx="3" />
            <rect x="42" y="2" width="16" height="10" rx="3" />
            <rect x="2" y="10" width="66" height="32" rx="7" />
          </g>
        </svg>
      ) : null}
      <span
        className={cn(
          'relative leading-none font-bold tracking-tight [font-family:var(--font-display)] tabular-nums',
          size === 'sm' && 'text-xs',
          size === 'md' && (setNumber.length > 6 ? 'text-lg' : 'text-2xl'),
          size === 'lg' && 'text-5xl',
        )}
      >
        {setNumber}
      </span>
    </div>
  );
}
