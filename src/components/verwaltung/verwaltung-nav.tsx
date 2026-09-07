'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'cn';

const tabs = [
  { href: '/verwaltung/sammler', label: 'Sammler', adminOnly: false },
  { href: '/verwaltung/hersteller', label: 'Hersteller', adminOnly: false },
  { href: '/verwaltung/themen', label: 'Themen', adminOnly: false },
  { href: '/verwaltung/standorte', label: 'Standorte', adminOnly: false },
  { href: '/verwaltung/einladungen', label: 'Einladungen', adminOnly: true },
  { href: '/verwaltung/erinnerungen', label: 'Erinnerungen', adminOnly: true },
  { href: '/verwaltung/daten', label: 'Daten', adminOnly: true },
] as const;

export function VerwaltungNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visible = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" aria-label="Stammdaten">
      {visible.map((tab) => {
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
