import Link from 'next/link';
import { BrickLogo } from '@/components/brick/logo';
import { DesktopNav } from './bottom-nav';
import { UserMenu } from './user-menu';
import type { SessionUser } from '@/lib/session';

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight [font-family:var(--font-display)]"
        >
          <BrickLogo className="h-6 w-7" />
          <span>Bricktrack</span>
        </Link>
        <div className="flex-1" />
        <DesktopNav />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
