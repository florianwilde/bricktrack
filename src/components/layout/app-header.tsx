import { Suspense } from 'react';
import Link from 'next/link';
import { BrickLogo } from '@/components/brick/logo';
import { DesktopNav } from './bottom-nav';
import { CollectorSwitch, type CollectorOption } from './collector-switch';
import type { SessionUser } from '@/lib/session';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '');
  return letters.toUpperCase() || '?';
}

export function AppHeader({
  user,
  collectors,
  storedCollectorId,
  legoImport,
}: {
  user: SessionUser;
  collectors: CollectorOption[];
  storedCollectorId: string | null;
  legoImport: boolean;
}) {
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
        <DesktopNav legoImport={legoImport} />
        {/* Account, design and master data: everything that is not daily use. */}
        <Link
          href="/mehr"
          aria-label="Mehr: Konto, Design und Verwaltung"
          title="Mehr"
          className="flex size-10 items-center justify-center rounded-[calc(var(--radius)*0.7)] border-[length:max(1px,var(--edge-w))] border-edge bg-card text-sm font-bold shadow-(--lift-sm) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {initials(user.name)}
        </Link>
      </div>

      {collectors.length > 1 ? (
        <div className="mx-auto max-w-5xl px-4 pb-2">
          {/* useSearchParams needs a boundary; the switch reads ?sammler=. */}
          <Suspense fallback={<div className="h-11" />}>
            <CollectorSwitch collectors={collectors} storedId={storedCollectorId} />
          </Suspense>
        </div>
      ) : null}
    </header>
  );
}
