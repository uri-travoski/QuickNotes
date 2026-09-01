import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { processAttachment } from '../services/thumbnail.js';
import { requireAuth } from '../services/auth.js';
import { storageManager } from '../services/storage/manager.js';

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure upload directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10)) * 1024 * 1024,
  },
});

// POST /api/attachments/upload - Upload file(s) for a note or draft
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const { note_id } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const createdAttachments = [];

    for (const file of files) {
      const filePath = file.path;
      const filename = file.filename;
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const mimeType = file.mimetype;
      const fileSize = file.size;

      // Process image thumbnail if applicable
      const thumbResult = await processAttachment(filePath, filename, mimeType, UPLOAD_DIR);

      // Upload to active cloud storage provider (Google Drive / S3 / Local)
      let storageProvider = 'local';
      let storagePath: string | null = null;
      try {
        const fileContent = fs.readFileSync(filePath);
        const uploadRes = await storageManager.upload(filename, fileContent, mimeType, 'attachments');
        storageProvider = uploadRes.storageProvider;
        storagePath = uploadRes.storagePath;
      } catch (uploadErr) {
        console.error(`Failed to upload attachment ${filename} to active storage provider:`, uploadErr);
      }

      const insertResult = await query(
        `INSERT INTO attachments 
          (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          note_id || null,
          filename,
          originalName,
          mimeType,
          fileSize,
          thumbResult.width,
          thumbResult.height,
          thumbResult.thumbnailFilename,
          storageProvider,
          storagePath,
        ]
      );
      createdAttachments.push(insertResult.rows[0]);
    }

    res.status(201).json(createdAttachments);
  } catch (error: any) {
    console.error('Error uploading attachments:', error);
    res.status(500).json({ error: 'Failed to upload attachments', details: error.message });
  }
});

// POST /api/attachments/:note_id - Upload attachment directly to existing note
router.post('/note/:note_id', upload.array('files', 10), async (req, res) => {
  const { note_id } = req.params;
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const noteCheck = await query('SELECT id FROM notes WHERE id = $1', [note_id]);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const createdAttachments = [];

    for (const file of files) {
      const filePath = file.path;
      const filename = file.filename;
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const mimeType = file.mimetype;
      const fileSize = file.size;

      const thumbResult = await processAttachment(filePath, filename, mimeType, UPLOAD_DIR);

      // Upload to active cloud storage provider (Google Drive / S3 / Local)
      let storageProvider = 'local';
      let storagePath: string | null = null;
      try {
        const fileContent = fs.readFileSync(filePath);
        const uploadRes = await storageManager.upload(filename, fileContent, mimeType, 'attachments');
        storageProvider = uploadRes.storageProvider;
        storagePath = uploadRes.storagePath;
      } catch (uploadErr) {
        console.error(`Failed to upload attachment ${filename} to active storage provider:`, uploadErr);
      }

      const insertResult = await query(
        `INSERT INTO attachments 
          (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, storage_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          note_id,
          filename,
          originalName,
          mimeType,
          fileSize,
          thumbResult.width,
          thumbResult.height,
          thumbResult.thumbnailFilename,
          storageProvider,
          storagePath,
        ]
      );
      createdAttachments.push(insertResult.rows[0]);
    }

    // Touch note updated_at
    await query('UPDATE notes SET updated_at = NOW() WHERE id = $1', [note_id]);

    res.status(201).json(createdAttachments);
  } catch (error: any) {
    console.error('Error uploading to note:', error);
    res.status(500).json({ error: 'Failed to upload attachment', details: error.message });
  }
});

// GET /api/attachments/:id/download - Download attachment
router.get('/:id/download', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM attachments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, attachment.filename);

    if (!fs.existsSync(filePath) && attachment.storage_provider && attachment.storage_provider !== 'local') {
      try {
        const cloudBuf = await storageManager.download(attachment.filename, attachment.storage_provider, 'attachments');
        fs.writeFileSync(filePath, cloudBuf);
      } catch (cloudErr) {
        console.error(`Failed to download ${attachment.filename} from ${attachment.storage_provider}:`, cloudErr);
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File on disk not found' });
    }

    res.download(filePath, attachment.original_name);
  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment', details: error.message });
  }
});

// DELETE /api/attachments/:id - Delete an attachment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM attachments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Remove file from active / registered storage provider
    if (attachment.storage_provider && attachment.storage_provider !== 'local') {
      try {
        await storageManager.delete(attachment.filename, attachment.storage_provider, 'attachments');
      } catch (err) {
        console.warn(`Failed to delete file from ${attachment.storage_provider}:`, err);
      }
    }

    // Remove files from disk safely
    const filePath = path.join(UPLOAD_DIR, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (attachment.thumbnail_filename) {
      const thumbPath = path.join(THUMBNAIL_DIR, attachment.thumbnail_filename);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    // Touch note updated_at
    if (attachment.note_id) {
      await query('UPDATE notes SET updated_at = NOW() WHERE id = $1', [attachment.note_id]);
    }

    res.json({ message: 'Attachment deleted successfully', attachment });
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment', details: error.message });
  }
});

export default router;
