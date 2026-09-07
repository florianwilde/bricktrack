import { cn } from 'cn';

/**
 * A plain <select>.
 *
 * Deliberately not the Radix select: this app is used on phones, where the
 * native picker is faster to operate, and the value lands in FormData without
 * a hidden mirror input.
 */
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}
