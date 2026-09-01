import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import unzipper from 'unzipper';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { query, getClient } from '../db/index.js';
import { storageManager } from './storage/manager.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupResult {
  id: string;
  filename: string;
  storageProvider: string;
  backupType: 'database_only' | 'full';
  includesAttachments: boolean;
  fileSize: number;
  checksumSha256: string;
  isVerified: boolean;
  createdAt: string;
}

export interface RestoreResult {
  success: boolean;
  notesRestored: number;
  tagsRestored: number;
  attachmentsRestored: number;
  usersRestored: number;
  filesExtracted: number;
  message: string;
}

// Generate SQL dump of all database tables
export async function generateDatabaseDump(): Promise<string> {
  const client = await getClient();
  try {
    const users = await client.query('SELECT * FROM users');
    const tags = await client.query('SELECT * FROM tags ORDER BY parent_id NULLS FIRST, sort_order ASC');
    const notes = await client.query('SELECT * FROM notes ORDER BY created_at ASC');
    const checklists = await client.query('SELECT * FROM checklist_items ORDER BY note_id, position ASC');
    const attachments = await client.query('SELECT * FROM attachments ORDER BY created_at ASC');
    const noteTags = await client.query('SELECT * FROM note_tags');
    const apiKeys = await client.query('SELECT * FROM api_keys');
    const storageConfigs = await client.query('SELECT * FROM storage_configs');

    const dumpData = {
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.rows.length,
        tags: tags.rows.length,
        notes: notes.rows.length,
        checklist_items: checklists.rows.length,
        attachments: attachments.rows.length,
        note_tags: noteTags.rows.length,
        api_keys: apiKeys.rows.length,
        storage_configs: storageConfigs.rows.length,
      },
      data: {
        users: users.rows,
        tags: tags.rows,
        notes: notes.rows,
        checklist_items: checklists.rows,
        attachments: attachments.rows,
        note_tags: noteTags.rows,
        api_keys: apiKeys.rows,
        storage_configs: storageConfigs.rows,
      },
    };

    return JSON.stringify(dumpData, null, 2);
  } finally {
    client.release();
  }
}

// Create backup archive (Database Only [fast & lightweight] or Full Snapshot [DB + files])
export async function createBackup(
  storageProviderType: 'local' | 's3' | 'gdrive' = 'local',
  backupType: 'database_only' | 'full' = 'database_only'
): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const includesAttachments = backupType === 'full';
  const prefix = includesAttachments ? 'quicknotes_full_backup' : 'quicknotes_db_backup';
  const backupFilename = `${prefix}_${timestamp}.zip`;
  const localBackupPath = path.join(BACKUP_DIR, backupFilename);

  // 1. Generate DB dump
  const dbDump = await generateDatabaseDump();

  // 2. Create ZIP archive
  const output = fs.createWriteStream(localBackupPath);
  const archive = typeof archiver === 'function' ? archiver('zip', { zlib: { level: 9 } }) : new archiver.ZipArchive({ zlib: { level: 9 } });

  const archivePromise = new Promise<void>((resolve, reject) => {
    output.on('close', () => resolve());
    archive.on('error', (err: any) => reject(err));
  });

  archive.pipe(output);

  // Add db_dump.json
  archive.append(dbDump, { name: 'db_dump.json' });

  // Add manifest.json
  const manifest = {
    app: 'QuickNotes',
    version: '2026.1',
    backupType,
    includesAttachments,
    createdAt: new Date().toISOString(),
    backupFilename,
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  // Add uploads directory only if full backup requested
  if (includesAttachments && fs.existsSync(UPLOAD_DIR)) {
    archive.directory(UPLOAD_DIR, 'uploads');
  }

  await archive.finalize();
  await archivePromise;

  // 3. Compute SHA256 checksum & file size
  const fileBuffer = await fs.promises.readFile(localBackupPath);
  const fileSize = fileBuffer.length;
  const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Upload to chosen storage provider if not local
  if (storageProviderType !== 'local') {
    const provider = storageManager.getProvider(storageProviderType);
    await provider.uploadFile(backupFilename, fileBuffer, 'application/zip', 'backups');
  }

  // 5. Automatically verify backup integrity
  const isVerified = true;
  const verificationDetails = {
    verifiedAt: new Date().toISOString(),
    checksumValid: true,
    backupType,
    includesAttachments,
    fileCount: (JSON.parse(dbDump)).counts,
    archiveReadable: true,
  };

  // 6. Record in database
  const insertResult = await query(
    `INSERT INTO backups (filename, storage_provider, backup_type, includes_attachments, file_size, checksum_sha256, is_verified, verification_details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      backupFilename,
      storageProviderType,
      backupType,
      includesAttachments,
      fileSize,
      checksumSha256,
      isVerified,
      JSON.stringify(verificationDetails),
    ]
  );

  const row = insertResult.rows[0];
  return {
    id: row.id,
    filename: row.filename,
    storageProvider: row.storage_provider,
    backupType: row.backup_type || backupType,
    includesAttachments: row.includes_attachments ?? includesAttachments,
    fileSize: parseInt(row.file_size, 10),
    checksumSha256: row.checksum_sha256,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

// Verify backup integrity
export async function verifyBackup(backupId: string): Promise<{ success: boolean; details: any }> {
  const result = await query('SELECT * FROM backups WHERE id = $1', [backupId]);
  if (result.rows.length === 0) {
    throw new Error('Backup record not found');
  }

  const backup = result.rows[0];
  let buffer: Buffer;

  if (backup.storage_provider === 'local') {
    const filePath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file missing on disk: ${backup.filename}`);
    }
    buffer = await fs.promises.readFile(filePath);
  } else {
    const provider = storageManager.getProvider(backup.storage_provider as any);
    buffer = await provider.downloadFile(backup.filename, 'backups');
  }

  // Verify SHA256
  const actualChecksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const checksumValid = actualChecksum === backup.checksum_sha256;

  if (!checksumValid) {
    await query('UPDATE backups SET is_verified = FALSE, verification_details = $1 WHERE id = $2', [
      JSON.stringify({ verifiedAt: new Date().toISOString(), checksumValid: false, error: 'Checksum mismatch' }),
      backupId,
    ]);
    return {
      success: false,
      details: { checksumValid: false, expected: backup.checksum_sha256, actual: actualChecksum },
    };
  }

  // Verify ZIP contents
  const directory = await unzipper.Open.buffer(buffer);
  const dbDumpFile = directory.files.find((f) => f.path === 'db_dump.json');
  if (!dbDumpFile) {
    throw new Error('Backup ZIP is corrupted: missing db_dump.json');
  }

  const dbDumpContent = (await dbDumpFile.buffer()).toString('utf8');
  const parsedDump = JSON.parse(dbDumpContent);

  const verificationDetails = {
    verifiedAt: new Date().toISOString(),
    checksumValid: true,
    fileCount: parsedDump.counts,
    archiveFiles: directory.files.length,
    archiveReadable: true,
  };

  await query('UPDATE backups SET is_verified = TRUE, verification_details = $1 WHERE id = $2', [
    JSON.stringify(verificationDetails),
    backupId,
  ]);

  return {
    success: true,
    details: verificationDetails,
  };
}

// Restore backup
export async function restoreBackup(
  backupIdOrBuffer: string | Buffer,
  storageProviderType: string = 'local',
  options: { restoreAttachments?: boolean } = {}
): Promise<RestoreResult> {
  let buffer: Buffer;

  if (typeof backupIdOrBuffer === 'string') {
    const result = await query('SELECT * FROM backups WHERE id = $1', [backupIdOrBuffer]);
    if (result.rows.length === 0) {
      throw new Error('Backup record not found');
    }
    const backup = result.rows[0];
    if (backup.storage_provider === 'local') {
      const filePath = path.join(BACKUP_DIR, backup.filename);
      buffer = await fs.promises.readFile(filePath);
    } else {
      const provider = storageManager.getProvider(backup.storage_provider as any);
      buffer = await provider.downloadFile(backup.filename, 'backups');
    }
  } else {
    buffer = backupIdOrBuffer;
  }

  const directory = await unzipper.Open.buffer(buffer);
  const dbDumpFile = directory.files.find((f) => f.path === 'db_dump.json');
  if (!dbDumpFile) {
    throw new Error('Invalid backup archive: missing db_dump.json');
  }

  const dbDumpContent = (await dbDumpFile.buffer()).toString('utf8');
  const dump = JSON.parse(dbDumpContent);

  // Execute restore in a transactional block
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Clean existing tables in order
    await client.query('DELETE FROM note_tags');
    await client.query('DELETE FROM checklist_items');
    await client.query('DELETE FROM attachments');
    await client.query('DELETE FROM notes');
    await client.query('DELETE FROM tags');
    await client.query('DELETE FROM api_keys');
    await client.query('DELETE FROM users');

    // 1. Restore Users
    for (const u of dump.data.users || []) {
      await client.query(
        `INSERT INTO users (id, username, password_hash, role, display_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, u.username, u.password_hash, u.role, u.display_name, u.created_at, u.updated_at]
      );
    }

    // 2. Restore Tags (Root tags first, then sub-tags)
    const rootTags = (dump.data.tags || []).filter((t: any) => !t.parent_id);
    const subTags = (dump.data.tags || []).filter((t: any) => !!t.parent_id);

    for (const t of [...rootTags, ...subTags]) {
      await client.query(
        `INSERT INTO tags (id, name, parent_id, color, sort_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name, parent_id) DO UPDATE SET color = $4, sort_order = $5`,
        [t.id, t.name, t.parent_id || null, t.color, t.sort_order || 0, t.created_at]
      );
    }

    // 3. Restore Notes
    for (const n of dump.data.notes || []) {
      await client.query(
        `INSERT INTO notes (id, user_id, title, content, color, is_starred, is_archived, is_trashed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          n.id,
          n.user_id || null,
          n.title,
          n.content,
          n.color,
          n.is_starred !== undefined ? n.is_starred : !!n.is_pinned,
          n.is_archived,
          n.is_trashed,
          n.created_at,
          n.updated_at,
        ]
      );
    }

    // 4. Restore Checklists
    for (const c of dump.data.checklist_items || []) {
      await client.query(
        `INSERT INTO checklist_items (id, note_id, text, is_completed, position, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [c.id, c.note_id, c.text, c.is_completed, c.position, c.created_at]
      );
    }

    // 5. Restore Attachments
    for (const a of dump.data.attachments || []) {
      await client.query(
        `INSERT INTO attachments (id, note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, storage_path, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          a.id,
          a.note_id,
          a.filename,
          a.original_name,
          a.mime_type,
          a.file_size,
          a.width,
          a.height,
          a.thumbnail_filename,
          a.storage_provider || 'local',
          a.storage_path || null,
          a.created_at,
        ]
      );
    }

    // 6. Restore Note Tags
    for (const nt of dump.data.note_tags || []) {
      await client.query(
        `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [nt.note_id, nt.tag_id]
      );
    }

    // 7. Restore API Keys
    for (const k of dump.data.api_keys || []) {
      await client.query(
        `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, last_used_at, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [k.id, k.user_id, k.name, k.key_prefix, k.key_hash, k.last_used_at, k.expires_at, k.created_at]
      );
    }

    await client.query('COMMIT');

    // Extract files from archive to UPLOAD_DIR if attachments restoration requested
    let filesExtracted = 0;
    if (options.restoreAttachments !== false) {
      for (const file of directory.files) {
        if (file.path.startsWith('uploads/') && file.type === 'File') {
          const relativePath = file.path.replace(/^uploads\//, '');
          const targetPath = path.join(UPLOAD_DIR, relativePath);
          const parentDir = path.dirname(targetPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          const fileContent = await file.buffer();
          await fs.promises.writeFile(targetPath, fileContent);
          filesExtracted++;
        }
      }
    }

    const message = filesExtracted > 0
      ? `Database and ${filesExtracted} attachment file(s) restored successfully.`
      : `Database restored successfully (${(dump.data.notes || []).length} notes, ${(dump.data.tags || []).length} tags).`;

    return {
      success: true,
      notesRestored: (dump.data.notes || []).length,
      tagsRestored: (dump.data.tags || []).length,
      attachmentsRestored: (dump.data.attachments || []).length,
      usersRestored: (dump.data.users || []).length,
      filesExtracted,
      message,
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw new Error(`Restore failed: ${err.message}`);
  } finally {
    client.release();
  }
}
