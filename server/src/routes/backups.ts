import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { query } from '../db/index.js';
import { requireOwner } from '../services/auth.js';
import { createBackup, verifyBackup, restoreBackup } from '../services/backup.js';
import { getScheduleConfig, updateScheduleConfig, executeScheduledBackup } from '../services/scheduler.js';
import { storageManager } from '../services/storage/manager.js';

const router = Router();
const BACKUP_DIR = path.join(process.cwd(), 'backups');

const upload = multer({
  dest: '/tmp',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit for backup uploads
});

// Backup settings require Owner role
router.use(requireOwner);

/**
 * Synchronize database backup records with physical storage.
 * Prunes orphaned DB records where the local file was deleted/missing,
 * and auto-indexes valid physical archives placed in the backups directory.
 */
async function syncStorageBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Fetch DB records and verify physical existence
  const dbResult = await query('SELECT * FROM backups');
  const dbRows = dbResult.rows;
  const existingFilenames = new Set<string>();

  for (const row of dbRows) {
    if (row.storage_provider === 'local') {
      const filePath = path.join(BACKUP_DIR, row.filename);
      if (!fs.existsSync(filePath)) {
        // Physical file does not exist on storage -> delete orphaned record
        await query('DELETE FROM backups WHERE id = $1', [row.id]);
        continue;
      }
      existingFilenames.add(row.filename);
    } else {
      existingFilenames.add(row.filename);
    }
  }

  // 2. Discover physical zip archives on disk not yet recorded in DB
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    for (const file of files) {
      if (file.endsWith('.zip') && !existingFilenames.has(file)) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile() && stats.size > 0) {
          const buf = await fs.promises.readFile(filePath);
          const checksum = crypto.createHash('sha256').update(buf).digest('hex');
          const isFull = file.includes('full');
          const backupType = isFull ? 'full' : 'database_only';

          await query(
            `INSERT INTO backups (filename, storage_provider, backup_type, includes_attachments, file_size, checksum_sha256, is_verified, verification_details, created_at)
             VALUES ($1, 'local', $2, $3, $4, $5, TRUE, $6, $7)`,
            [
              file,
              backupType,
              isFull,
              stats.size,
              checksum,
              JSON.stringify({ autoIndexed: true, verifiedAt: new Date().toISOString() }),
              stats.birthtime || stats.mtime || new Date(),
            ]
          );
        }
      }
    }
  } catch (scanErr) {
    console.warn('Warning: Could not scan backups directory:', scanErr);
  }
}

// GET /api/backups - List all backups verified on physical storage
router.get('/', async (req, res) => {
  try {
    await syncStorageBackups();

    const result = await query(
      `SELECT id, filename, storage_provider, backup_type, includes_attachments, file_size, checksum_sha256, is_verified, verification_details, created_at
       FROM backups
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups', details: error.message });
  }
});

// GET /api/backups/schedule - Get automated backup schedule configuration
router.get('/schedule', async (req, res) => {
  try {
    const schedule = await getScheduleConfig();
    res.json(schedule);
  } catch (error: any) {
    console.error('Error fetching backup schedule:', error);
    res.status(500).json({ error: 'Failed to fetch backup schedule', details: error.message });
  }
});

// POST /api/backups/schedule - Update automated backup schedule configuration
router.post('/schedule', async (req, res) => {
  try {
    const updated = await updateScheduleConfig(req.body);
    res.json({
      message: 'Backup schedule updated successfully',
      schedule: updated,
    });
  } catch (error: any) {
    console.error('Error updating backup schedule:', error);
    res.status(500).json({ error: 'Failed to update backup schedule', details: error.message });
  }
});

// POST /api/backups/schedule/run-now - Trigger scheduled backup immediately
router.post('/schedule/run-now', async (req, res) => {
  try {
    const result = await executeScheduledBackup();
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Scheduled backup execution failed' });
    }
    res.json({
      message: 'Scheduled backup executed successfully',
      backup: result.backup,
    });
  } catch (error: any) {
    console.error('Error running scheduled backup:', error);
    res.status(500).json({ error: 'Failed to run scheduled backup', details: error.message });
  }
});

// POST /api/backups/create - Create a new backup (Database Only or Full Snapshot)
router.post('/create', async (req, res) => {
  const { storage_provider = 'local', backup_type = 'database_only' } = req.body;

  if (!['local', 's3', 'gdrive'].includes(storage_provider)) {
    return res.status(400).json({ error: 'Invalid storage provider (must be local, s3, or gdrive)' });
  }
  if (!['database_only', 'full'].includes(backup_type)) {
    return res.status(400).json({ error: 'Invalid backup type (must be database_only or full)' });
  }

  try {
    const backup = await createBackup(storage_provider as any, backup_type as any);
    res.status(201).json({
      message: 'Backup created and verified successfully',
      backup,
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup', details: error.message });
  }
});

// POST /api/backups/:id/verify - Verify backup integrity
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await verifyBackup(id);
    res.json({
      message: result.success ? 'Backup integrity verified successfully' : 'Backup verification failed',
      details: result.details,
    });
  } catch (error: any) {
    console.error('Error verifying backup:', error);
    res.status(500).json({ error: 'Failed to verify backup', details: error.message });
  }
});

// POST /api/backups/:id/restore - Restore backup from storage
router.post('/:id/restore', async (req, res) => {
  const { id } = req.params;
  const { restoreAttachments = true } = req.body;
  try {
    const result = await restoreBackup(id, 'local', { restoreAttachments: !!restoreAttachments });
    res.json({
      message: result.message || 'Backup restored successfully',
      result,
    });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup', details: error.message });
  }
});

// POST /api/backups/upload-restore - Upload backup file and restore
router.post('/upload-restore', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No backup file uploaded' });
  }

  const restoreAttachments = req.body.restoreAttachments !== 'false' && req.body.restoreAttachments !== false;

  try {
    const fileBuffer = await fs.promises.readFile(req.file.path);
    const result = await restoreBackup(fileBuffer, 'local', { restoreAttachments });
    await fs.promises.unlink(req.file.path);

    res.json({
      message: result.message || 'Uploaded backup restored successfully',
      result,
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path);
    }
    console.error('Error restoring uploaded backup:', error);
    res.status(500).json({ error: 'Failed to restore uploaded backup', details: error.message });
  }
});

// GET /api/backups/:id/download - Download backup file
router.get('/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM backups WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];
    let buffer: Buffer;

    if (backup.storage_provider === 'local') {
      const filePath = path.join(BACKUP_DIR, backup.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Backup file not found on disk' });
      }
      return res.download(filePath, backup.filename);
    } else {
      const provider = storageManager.getProvider(backup.storage_provider as any);
      buffer = await provider.downloadFile(backup.filename, 'backups');
      res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
      res.setHeader('Content-Type', 'application/zip');
      return res.send(buffer);
    }
  } catch (error: any) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup', details: error.message });
  }
});

// DELETE /api/backups/:id - Delete backup
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM backups WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const backup = result.rows[0];
    if (backup.storage_provider === 'local') {
      const filePath = path.join(BACKUP_DIR, backup.filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } else {
      try {
        const provider = storageManager.getProvider(backup.storage_provider as any);
        await provider.deleteFile(backup.filename, 'backups');
      } catch (err) {
        console.warn('Failed to delete remote backup file:', err);
      }
    }

    res.json({ message: 'Backup deleted successfully', backup });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup', details: error.message });
  }
});

export default router;
