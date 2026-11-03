import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';

// A throwaway data directory for this file alone.
const DATA_DIR = path.resolve(process.cwd(), 'data-test-backup');
process.env.DATA_DIR = DATA_DIR;
process.env.BACKUP_KEEP = '3';

fs.rmSync(DATA_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(DATA_DIR, 'db'), { recursive: true });
{
  const sqlite = new Database(path.join(DATA_DIR, 'db', 'bricktrack.db'));
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), 'drizzle') });
  sqlite.close();
}

const { db } = await import('@/db');
const schema = await import('@/db/schema');
const { createBackup, listBackups, pruneBackups } = await import('@/lib/backup');
const { runBackupJob } = await import('@/lib/backup-job');

const BACKUPS = path.join(DATA_DIR, 'backups');
const FILE = path.join(DATA_DIR, 'files', 'instructions', 's-1', 'anleitung.pdf');
const now = new Date('2026-11-03T03:10:00');

beforeEach(() => {
  fs.rmSync(BACKUPS, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, '%PDF-1.4 Anleitung');
  db.delete(schema.manufacturer).run();
  db.insert(schema.manufacturer)
    .values({ id: 'm-1', name: 'Lego', slug: 'lego', createdAt: now, updatedAt: now })
    .run();
});

describe('Sicherung', () => {
  it('legt eine vollständige, lesbare Kopie der Datenbank an', () => {
    const backup = createBackup('manual', now);
    expect(backup.name).toBe('2026-11-03_0310');

    const copy = new Database(path.join(BACKUPS, backup.name, 'bricktrack.db'), { readonly: true });
    expect(copy.prepare('select name from manufacturer').all()).toEqual([{ name: 'Lego' }]);
    // Accounts travel too - this is a backup, not an export.
    expect(copy.prepare("select count(*) as n from sqlite_master where name = 'user'").get()).toEqual({ n: 1 });
    copy.close();

    expect(listBackups().map((entry) => [entry.name, entry.reason, entry.fileCount])).toEqual([
      [backup.name, 'manual', 1],
    ]);
  });

  it('verlinkt Dateien, statt sie zu kopieren, und behält gelöschte', () => {
    const backup = createBackup('manual', now);
    const linked = path.join(BACKUPS, backup.name, 'files', 'instructions', 's-1', 'anleitung.pdf');
    expect(fs.statSync(linked).ino).toBe(fs.statSync(FILE).ino);

    fs.rmSync(FILE);
    expect(fs.readFileSync(linked, 'utf8')).toBe('%PDF-1.4 Anleitung');
  });

  it('gibt zwei Sicherungen in derselben Minute verschiedene Namen', () => {
    expect(createBackup('manual', now).name).not.toBe(createBackup('manual', now).name);
  });

  it('übersieht halbfertige und fremde Ordner', () => {
    createBackup('manual', now);
    fs.mkdirSync(path.join(BACKUPS, '.2026-11-03_0400.partial'), { recursive: true });
    fs.mkdirSync(path.join(BACKUPS, 'irgendwas'), { recursive: true });
    expect(listBackups()).toHaveLength(1);
  });

  it('behält nur die neuesten Stände', () => {
    for (let day = 1; day <= 5; day += 1) createBackup('nightly', new Date(`2026-11-0${day}T03:00:00`));
    expect(pruneBackups()).toEqual(['2026-11-02_0300', '2026-11-01_0300']);
    expect(listBackups().map((entry) => entry.name)).toEqual([
      '2026-11-05_0300',
      '2026-11-04_0300',
      '2026-11-03_0300',
    ]);
  });

  it('sichert nachts nur, wenn es fällig ist', () => {
    expect(runBackupJob(now).created).toBe('2026-11-03_0310');
    expect(runBackupJob(new Date('2026-11-03T15:00:00')).created).toBeNull();
    expect(runBackupJob(new Date('2026-11-04T03:00:00')).created).toBe('2026-11-04_0300');
  });
});
