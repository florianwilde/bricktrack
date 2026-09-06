import { cn } from 'cn';
import { Label } from './label';

/** Label + control + optional hint, the layout every form in the app uses. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {/* aria-hidden keeps the accessible name clean ("Name", not "Name *");
            the required state is already carried by the input itself. */}
        {required ? (
          <span aria-hidden className="text-destructive">
            {' *'}
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
