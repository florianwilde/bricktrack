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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
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
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="size-5" aria-hidden />
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
                ? 'bg-muted text-foreground'
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
