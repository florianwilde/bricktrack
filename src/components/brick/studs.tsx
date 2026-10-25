import { cn } from 'cn';

/**
 * The row of studs on top of a card. Purely decorative and only visible in
 * designs that set `--studs: flex`. The parent must be `relative` and must not
 * clip its overflow - place it next to the card, not inside.
 */
export function Studs({
  count = 2,
  className,
  studClassName,
}: {
  count?: number;
  className?: string;
  /** Colour of the studs, e.g. the collector's dot class. */
  studClassName?: string;
}) {
  return (
    <span aria-hidden className={cn('studs', className)}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={cn('stud', studClassName)} />
      ))}
    </span>
  );
}
