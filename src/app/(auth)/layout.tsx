import Link from 'next/link';
import { BrickLogo } from '@/components/brick/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Link
        href="/"
        className="flex items-center gap-2 text-2xl font-bold tracking-tight [font-family:var(--font-display)]"
      >
        <BrickLogo className="h-8 w-9" />
        Bricktrack
      </Link>
      <main className="w-full max-w-sm">{children}</main>
      <p className="text-center text-xs text-muted-foreground">
        Die Sammlung und die Wunschlisten deiner Familie – auf deinem eigenen Server.
      </p>
    </div>
  );
}
