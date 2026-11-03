/**
 * When to back up and which backups to let go (pure, testable).
 *
 * The nightly backup runs from the hourly scheduler: the first tick after
 * three o'clock on a day without a backup takes it. If the server was off at
 * night, the backup is simply late - after 36 hours without one it runs
 * whatever the time, so a machine that is only switched on during the day
 * still gets backed up.
 */

export const BACKUP_HOUR = 3;
const OVERDUE_MS = 36 * 60 * 60 * 1000;

export type BackupReason = 'nightly' | 'manual' | 'before-import';

export const BACKUP_REASON_LABELS: Record<BackupReason, string> = {
  nightly: 'Nachts',
  manual: 'Von Hand',
  'before-import': 'Vor einem Import',
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function isBackupDue(lastBackupAt: Date | null, now: Date, hour = BACKUP_HOUR): boolean {
  if (!lastBackupAt) return true;
  if (now.getTime() - lastBackupAt.getTime() >= OVERDUE_MS) return true;
  return !sameDay(lastBackupAt, now) && now.getHours() >= hour;
}

/** Folder name, sortable and readable: `2026-11-03_0300`. */
export function backupName(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/** Everything beyond the newest `keep` backups. `keep` 0 means: keep all. */
export function backupsToDelete<T extends { createdAt: Date }>(backups: T[], keep: number): T[] {
  if (keep <= 0) return [];
  return [...backups].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(keep);
}
