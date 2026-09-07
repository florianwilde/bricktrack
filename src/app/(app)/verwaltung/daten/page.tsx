import type { Metadata } from 'next';
import { DataTransfer } from '@/components/verwaltung/data-transfer';
import { requireAdmin } from '@/lib/session';

export const metadata: Metadata = { title: 'Daten' };

export default async function DatenPage() {
  await requireAdmin();
  return <DataTransfer />;
}
