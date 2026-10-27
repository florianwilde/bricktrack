'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Gift, House, LayoutGrid } from 'lucide-react';
import { cn } from 'cn';
import { AddMenu } from './add-menu';

/**
 * Four places and the plus in the middle. Account, design and master data
 * sit behind "Mehr" in the header - they are not part of the daily routine.
 */
const items = [
  { href: '/', label: 'Start', icon: House },
  { href: '/katalog', label: 'Katalog', icon: LayoutGrid },
  { href: '/sammlung', label: 'Sammlung', icon: Boxes },
  { href: '/wunschlisten', label: 'Wünsche', icon: Gift },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: (typeof items)[number]; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
        active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground',
      )}
    >
      {/* The active tab sits on a small plate, like a tile on a baseplate. */}
      <span
        className={cn(
          'flex h-7 w-12 items-center justify-center rounded-[calc(var(--radius)*0.6)] border-[length:var(--edge-w)]',
          active ? 'border-edge bg-secondary text-secondary-foreground' : 'border-transparent',
        )}
      >
        <item.icon className="size-5" aria-hidden />
      </span>
      {item.label}
    </Link>
  );
}

export function BottomNav({ legoImport }: { legoImport: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[length:max(1px,var(--edge-w))] border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-center">
        {items.slice(0, 2).map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}
        <li className="flex justify-center">
          <AddMenu legoImport={legoImport} />
        </li>
        {items.slice(2).map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DesktopNav({ legoImport }: { legoImport: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
              active
                ? 'border-[length:var(--edge-w)] border-edge bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <span className="ml-2">
        <AddMenu legoImport={legoImport} variant="button" />
      </span>
    </nav>
  );
}
