/**
 * The small colour palette that tells collectors apart.
 *
 * Fixed classes rather than computed ones, because Tailwind only ships the
 * classes it can see in the source.
 */
export const COLLECTOR_COLOR_LABELS: Record<string, string> = {
  blue: 'Blau',
  green: 'Grün',
  amber: 'Gelb',
  rose: 'Rot',
  violet: 'Violett',
  slate: 'Grau',
};

const BADGE_CLASSES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  green: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  rose: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
  violet: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  slate: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
};

export function collectorBadgeClass(color: string | null | undefined): string {
  return BADGE_CLASSES[color ?? 'blue'] ?? BADGE_CLASSES.blue!;
}

const DOT_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  slate: 'bg-slate-500',
};

export function collectorDotClass(color: string | null | undefined): string {
  return DOT_CLASSES[color ?? 'blue'] ?? DOT_CLASSES.blue!;
}
