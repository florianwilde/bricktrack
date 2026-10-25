'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Gift, LayoutGrid, User } from 'lucide-react';
import { cn } from 'cn';

const items = [
  { href: '/katalog', label: 'Katalog', icon: LayoutGrid },
  { href: '/sammlung', label: 'Sammlung', icon: Boxes },
  { href: '/wunschlisten', label: 'Wünsche', icon: Gift },
  { href: '/konto', label: 'Konto', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[length:max(1px,var(--edge-w))] border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  active
                    ? 'font-bold text-foreground'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {/* The active tab sits on a small plate, like a tile on a baseplate. */}
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-[calc(var(--radius)*0.6)] border-[length:var(--edge-w)]',
                    active
                      ? 'border-edge bg-secondary text-secondary-foreground'
                      : 'border-transparent',
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </nav>
  );
}
