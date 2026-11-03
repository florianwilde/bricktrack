import type { Metadata } from 'next';
import { BackupCard } from '@/components/verwaltung/backup-card';
import { DataTransfer } from '@/components/verwaltung/data-transfer';
import { env } from '@/env';
import { listBackups } from '@/lib/backup';
import { requireAdmin } from '@/lib/session';

export const metadata: Metadata = { title: 'Daten' };

export default async function DatenPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      {/* The path as configured, not the absolute one inside the container. */}
      <BackupCard backups={listBackups()} keep={env.BACKUP_KEEP} directory="DATA_DIR/backups" />
      <DataTransfer />
    </div>
  );
}
