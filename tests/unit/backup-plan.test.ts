import { describe, expect, it } from 'vitest';
import { backupName, backupsToDelete, isBackupDue } from '@/lib/backup-plan';

const at = (value: string) => new Date(value);

describe('Zeitplan der Sicherung', () => {
  it('sichert sofort, wenn es noch keine Sicherung gibt', () => {
    expect(isBackupDue(null, at('2026-11-03T14:00:00'))).toBe(true);
  });

  it('sichert einmal je Nacht ab drei Uhr', () => {
    const last = at('2026-11-02T03:05:00');
    expect(isBackupDue(last, at('2026-11-03T02:59:00'))).toBe(false);
    expect(isBackupDue(last, at('2026-11-03T03:00:00'))).toBe(true);
    expect(isBackupDue(at('2026-11-03T03:00:00'), at('2026-11-03T23:00:00'))).toBe(false);
  });

  it('holt eine verpasste Nacht nach 36 Stunden nach, egal zu welcher Uhrzeit', () => {
    expect(isBackupDue(at('2026-11-01T03:00:00'), at('2026-11-02T14:00:00'))).toBe(true);
    expect(isBackupDue(at('2026-11-02T03:00:00'), at('2026-11-03T01:00:00'))).toBe(false);
  });

  it('benennt Ordner sortierbar', () => {
    expect(backupName(at('2026-01-05T03:07:00'))).toBe('2026-01-05_0307');
  });

  it('behält die neuesten und gibt den Rest frei', () => {
    const backups = ['2026-11-01', '2026-11-03', '2026-11-02', '2026-10-31'].map((day) => ({
      name: day,
      createdAt: at(`${day}T03:00:00`),
    }));
    expect(backupsToDelete(backups, 2).map((backup) => backup.name)).toEqual(['2026-11-01', '2026-10-31']);
    expect(backupsToDelete(backups, 10)).toEqual([]);
    expect(backupsToDelete(backups, 0)).toEqual([]);
  });
});
