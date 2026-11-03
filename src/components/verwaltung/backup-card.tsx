'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { DatabaseBackup, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBackupAction } from '@/app/(app)/verwaltung/daten/actions';
import { BACKUP_REASON_LABELS, type BackupReason } from '@/lib/backup-plan';
import { formatDateTime, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type BackupRow = {
  name: string;
  createdAt: Date;
  reason: BackupReason;
  databaseBytes: number;
  fileCount: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`;
}

export function BackupCard({
  backups,
  keep,
  directory,
}: {
  backups: BackupRow[];
  keep: number;
  directory: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function backupNow() {
    startTransition(async () => {
      const result = await createBackupAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Gesichert: ${result.data.name}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatische Sicherung</CardTitle>
        <CardDescription>
          {keep === 0
            ? 'Ausgeschaltet (BACKUP_KEEP=0). Vor jedem Import wird trotzdem gesichert.'
            : `Jede Nacht ab 3 Uhr eine vollständige Sicherung – Datenbank mit Konten und alle Dateien. Die letzten ${keep} bleiben, dazu eine vor jedem Import.`}{' '}
          Sie liegen unter <code className="font-mono text-xs">{directory}</code>, also auf
          derselben Platte – gegen einen Plattenschaden hilft nur die Sicherung von{' '}
          <code className="font-mono text-xs">./data</code> auf ein anderes Gerät.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={backupNow} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <DatabaseBackup />}
          Jetzt sichern
        </Button>

        {backups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Sicherung vorhanden.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {backups.map((backup) => (
              <li key={backup.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">{formatDateTime(backup.createdAt)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{backup.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {BACKUP_REASON_LABELS[backup.reason]} · Datenbank {formatSize(backup.databaseBytes)} ·{' '}
                  {formatNumber(backup.fileCount)} Dateien
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Zurückspielen geht bewusst nur auf dem Server, nicht in der App – die Schritte stehen im
          README unter „Automatische Sicherung“.
        </p>
      </CardContent>
    </Card>
  );
}
