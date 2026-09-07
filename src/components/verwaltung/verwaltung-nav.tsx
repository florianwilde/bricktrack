'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'cn';

const tabs = [
  { href: '/verwaltung/hersteller', label: 'Hersteller' },
  { href: '/verwaltung/themen', label: 'Themen' },
  { href: '/verwaltung/standorte', label: 'Standorte' },
] as const;

export function VerwaltungNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" aria-label="Stammdaten">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md px-3 py-2 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
