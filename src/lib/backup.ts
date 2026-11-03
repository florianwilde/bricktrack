import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/db';
import { env } from '@/env';
import { backupName, backupsToDelete, type BackupReason } from './backup-plan';

/**
 * Backups inside the data directory.
 *
 * Each backup is a folder under DATA_DIR/backups with a consistent copy of the
 * database (`VACUUM INTO`, safe while the app keeps writing in WAL mode) and
 * the uploaded files as hard links: a file that did not change costs no
 * space, and one that gets deleted later stays in the backup. Unlike the
 * export, a backup is complete - accounts and passkeys included - so it never
 * leaves the server through the app.
 *
 * It guards against mistakes (a wrong import, a deleted set), not against a
 * broken disk: the folder lives next to the data, and ./data as a whole still
 * belongs on another device.
 */

export type BackupInfo = {
  name: string;
  createdAt: Date;
  reason: BackupReason;
  databaseBytes: number;
  fileCount: number;
};

const META_FILE = 'backup.json';

function readInfo(name: string): BackupInfo | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(env.BACKUPS_DIR, name, META_FILE), 'utf8')) as {
      createdAt?: string;
      reason?: BackupReason;
      databaseBytes?: number;
      fileCount?: number;
    };
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
    return {
      name,
      createdAt,
      reason: raw.reason ?? 'nightly',
      databaseBytes: raw.databaseBytes ?? 0,
      fileCount: raw.fileCount ?? 0,
    };
  } catch {
    return null;
  }
}

/** Newest first. Folders without a readable backup.json are not backups. */
export function listBackups(): BackupInfo[] {
  if (!fs.existsSync(env.BACKUPS_DIR)) return [];
  return fs
    .readdirSync(env.BACKUPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => readInfo(entry.name))
    .filter((info): info is BackupInfo => info !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Mirrors the files directory with hard links, copying where linking is not possible. */
function linkFiles(source: string, target: string): number {
  if (!fs.existsSync(source)) return 0;
  let count = 0;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      count += linkFiles(from, to);
    } else if (entry.isFile()) {
      try {
        fs.linkSync(from, to);
      } catch {
        // Another filesystem or no link support: a copy is still a backup.
        fs.copyFileSync(from, to);
      }
      count += 1;
    }
  }
  return count;
}

function uniqueName(base: string): string {
  let name = base;
  for (let suffix = 2; fs.existsSync(path.join(env.BACKUPS_DIR, name)); suffix += 1) {
    name = `${base}-${suffix}`;
  }
  return name;
}

export function createBackup(reason: BackupReason, now = new Date()): BackupInfo {
  const name = uniqueName(backupName(now));
  const finalDir = path.join(env.BACKUPS_DIR, name);
  // Built under a hidden name and renamed at the end, so a half-written
  // backup is never listed and never restored by mistake.
  const workDir = path.join(env.BACKUPS_DIR, `.${name}.partial`);
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const databasePath = path.join(workDir, 'bricktrack.db');
    db.$client.prepare('VACUUM INTO ?').run(databasePath);
    const fileCount = linkFiles(env.FILES_DIR, path.join(workDir, 'files'));

    const info: BackupInfo = {
      name,
      createdAt: now,
      reason,
      databaseBytes: fs.statSync(databasePath).size,
      fileCount,
    };
    fs.writeFileSync(
      path.join(workDir, META_FILE),
      JSON.stringify({ ...info, createdAt: now.toISOString(), app: 'bricktrack' }, null, 2),
    );
    fs.renameSync(workDir, finalDir);
    return info;
  } catch (error) {
    fs.rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

/** Removes everything beyond the newest `keep` backups; returns their names. */
export function pruneBackups(keep = env.BACKUP_KEEP): string[] {
  const doomed = backupsToDelete(listBackups(), keep);
  for (const backup of doomed) {
    fs.rmSync(path.join(env.BACKUPS_DIR, backup.name), { recursive: true, force: true });
  }
  return doomed.map((backup) => backup.name);
}
