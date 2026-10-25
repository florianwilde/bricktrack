import type { Metadata } from 'next';
import { VerwaltungHeader } from '@/components/verwaltung/verwaltung-header';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Verwaltung' };

export default async function VerwaltungLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="space-y-6">
      <VerwaltungHeader />
      {children}
    </div>
  );
}
