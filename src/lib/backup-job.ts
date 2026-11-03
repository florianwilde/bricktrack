import 'server-only';
import { env } from '@/env';
import { createBackup, listBackups, pruneBackups } from './backup';
import { isBackupDue } from './backup-plan';

/** One run of the nightly backup; does nothing when it is not due. */
export function runBackupJob(now = new Date()): { created: string | null; removed: string[] } {
  if (env.BACKUP_KEEP === 0) return { created: null, removed: [] };

  const latest = listBackups().find((backup) => backup.reason !== 'before-import') ?? null;
  if (!isBackupDue(latest?.createdAt ?? null, now)) return { created: null, removed: [] };

  const backup = createBackup('nightly', now);
  return { created: backup.name, removed: pruneBackups() };
}

const HOUR_MS = 60 * 60 * 1000;
const globalForBackups = globalThis as unknown as { bricktrackBackups?: boolean };

/**
 * Hourly check, started the same way as the reminder scheduler: lazily from
 * the healthcheck and the app layout, once per process.
 */
export function ensureBackupScheduler(): void {
  if (globalForBackups.bricktrackBackups) return;
  globalForBackups.bricktrackBackups = true;

  console.log(
    env.BACKUP_KEEP === 0
      ? '[backup] Ausgeschaltet (BACKUP_KEEP=0).'
      : `[backup] Aktiv: naechtlich nach ${env.BACKUPS_DIR}, ${env.BACKUP_KEEP} Staende.`,
  );

  const tick = () => {
    try {
      const run = runBackupJob();
      if (run.created) {
        console.log(
          `[backup] ${run.created} angelegt${run.removed.length > 0 ? `, ${run.removed.length} alte entfernt` : ''}.`,
        );
      }
    } catch (error) {
      console.error('[backup] Sicherung fehlgeschlagen', error);
    }
  };

  // Later than the reminders, so the two never start in the same second.
  setTimeout(tick, 2 * 60_000).unref?.();
  setInterval(tick, HOUR_MS).unref?.();
}
