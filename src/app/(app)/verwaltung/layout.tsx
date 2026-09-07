import type { Metadata } from 'next';
import { VerwaltungNav } from '@/components/verwaltung/verwaltung-nav';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Verwaltung' };

export default async function VerwaltungLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verwaltung</h1>
        <p className="text-sm text-muted-foreground">
          Stammdaten, die im Katalog und in der Sammlung ausgewählt werden.
        </p>
      </div>
      <VerwaltungNav />
      {children}
    </div>
  );
}
