import Link from 'next/link';
import { Blocks } from 'lucide-react';
import { DesktopNav } from './bottom-nav';
import { UserMenu } from './user-menu';
import type { SessionUser } from '@/lib/session';

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Blocks className="size-5 text-primary" aria-hidden />
          <span>Bricktrack</span>
        </Link>
        <div className="flex-1" />
        <DesktopNav />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
