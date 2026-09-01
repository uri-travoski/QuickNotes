import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';
import { createBackup } from './backup.js';
import { storageManager } from './storage/manager.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export interface BackupScheduleConfig {
  id: string;
  enabled: boolean;
  interval_days: number;
  backup_type: 'database_only' | 'full';
  storage_provider: 'local' | 's3' | 'gdrive';
  retention_count: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

let schedulerTimer: NodeJS.Timeout | null = null;
let isJobRunning = false;

/**
 * Fetch current backup schedule configuration.
 */
export async function getScheduleConfig(): Promise<BackupScheduleConfig> {
  const result = await query('SELECT * FROM backup_schedules WHERE id = $1', ['default']);
  if (result.rows.length === 0) {
    const inserted = await query(
      `INSERT INTO backup_schedules (id, enabled, interval_days, backup_type, storage_provider, retention_count)
       VALUES ('default', FALSE, 1, 'database_only', 'local', 7)
       RETURNING *`
    );
    return inserted.rows[0];
  }
  return result.rows[0];
}

/**
 * Update backup schedule configuration and re-calculate next trigger timestamp.
 */
export async function updateScheduleConfig(data: {
  enabled?: boolean;
  interval_days?: number;
  backup_type?: 'database_only' | 'full';
  storage_provider?: 'local' | 's3' | 'gdrive';
  retention_count?: number;
}): Promise<BackupScheduleConfig> {
  const current = await getScheduleConfig();

  const enabled = data.enabled !== undefined ? !!data.enabled : current.enabled;
  const intervalDays = data.interval_days !== undefined ? Math.max(1, parseInt(String(data.interval_days), 10)) : current.interval_days;
  const backupType = data.backup_type || current.backup_type;
  const storageProvider = data.storage_provider || current.storage_provider;
  const retentionCount = data.retention_count !== undefined ? Math.max(0, parseInt(String(data.retention_count), 10)) : current.retention_count;

  // Calculate next run time if enabled
  let nextRunAt = current.next_run_at;
  if (enabled) {
    if (!nextRunAt || new Date(nextRunAt).getTime() <= Date.now()) {
      nextRunAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
    }
  } else {
    nextRunAt = null;
  }

  const result = await query(
    `UPDATE backup_schedules
     SET enabled = $1,
         interval_days = $2,
         backup_type = $3,
         storage_provider = $4,
         retention_count = $5,
         next_run_at = $6,
         updated_at = NOW()
     WHERE id = 'default'
     RETURNING *`,
    [enabled, intervalDays, backupType, storageProvider, retentionCount, nextRunAt]
  );

  return result.rows[0];
}

/**
 * Prune old backups exceeding retention count.
 */
async function pruneOldBackups(retentionCount: number): Promise<number> {
  if (retentionCount <= 0) return 0;

  const result = await query(
    `SELECT id, filename, storage_provider FROM backups ORDER BY created_at DESC`
  );

  const backups = result.rows;
  if (backups.length <= retentionCount) return 0;

  const toDelete = backups.slice(retentionCount);
  let deletedCount = 0;

  for (const b of toDelete) {
    try {
      if (b.storage_provider === 'local') {
        const filePath = path.join(BACKUP_DIR, b.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else {
        try {
          const provider = storageManager.getProvider(b.storage_provider);
          await provider.deleteFile(b.filename, 'backups');
        } catch (storageErr) {
          console.warn(`Could not delete remote backup file ${b.filename}:`, storageErr);
        }
      }

      await query('DELETE FROM backups WHERE id = $1', [b.id]);
      deletedCount++;
    } catch (err) {
      console.error(`Failed to prune backup ${b.filename}:`, err);
    }
  }

  return deletedCount;
}

/**
 * Execute scheduled backup run.
 */
export async function executeScheduledBackup(): Promise<{ success: boolean; backup?: any; error?: string }> {
  if (isJobRunning) {
    return { success: false, error: 'A backup job is already in progress' };
  }

  isJobRunning = true;
  const schedule = await getScheduleConfig();

  try {
    console.log(`[Scheduler] Starting automated backup (Type: ${schedule.backup_type}, Storage: ${schedule.storage_provider})...`);
    const backup = await createBackup(schedule.storage_provider as any, schedule.backup_type as any);

    // Prune old backups if retention policy is set
    if (schedule.retention_count > 0) {
      const pruned = await pruneOldBackups(schedule.retention_count);
      if (pruned > 0) {
        console.log(`[Scheduler] Pruned ${pruned} old backup(s) per retention policy (Limit: ${schedule.retention_count})`);
      }
    }

    // Schedule next run
    const nextRun = new Date(Date.now() + schedule.interval_days * 24 * 60 * 60 * 1000).toISOString();

    await query(
      `UPDATE backup_schedules
       SET last_run_at = NOW(),
           next_run_at = $1,
           last_status = 'success',
           last_error = NULL,
           updated_at = NOW()
       WHERE id = 'default'`,
      [nextRun]
    );

    console.log(`[Scheduler] Automated backup completed successfully: ${backup.filename}. Next run: ${nextRun}`);
    return { success: true, backup };
  } catch (err: any) {
    console.error('[Scheduler] Automated backup failed:', err);
    await query(
      `UPDATE backup_schedules
       SET last_run_at = NOW(),
           last_status = 'failed',
           last_error = $1,
           updated_at = NOW()
       WHERE id = 'default'`,
      [err.message || 'Unknown backup error']
    );
    return { success: false, error: err.message };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Check if automated backup is due.
 */
async function checkSchedule() {
  try {
    const schedule = await getScheduleConfig();
    if (!schedule.enabled) return;

    const now = Date.now();
    const nextRunTime = schedule.next_run_at ? new Date(schedule.next_run_at).getTime() : 0;

    if (!schedule.next_run_at || nextRunTime <= now) {
      await executeScheduledBackup();
    }
  } catch (err) {
    console.error('[Scheduler] Error checking backup schedule:', err);
  }
}

/**
 * Start the background scheduler service.
 */
export function startBackupScheduler(intervalMs: number = 60 * 1000) {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('[Scheduler] Background Backup Scheduler initialized.');
  setTimeout(() => {
    checkSchedule();
  }, 10 * 1000);

  schedulerTimer = setInterval(() => {
    checkSchedule();
  }, intervalMs);
}
