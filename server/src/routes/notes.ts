import { Router } from 'express';
import { query, getClient } from '../db/index.js';
import { requireAuth, requireNotApiForDelete } from '../services/auth.js';
import { storageManager } from '../services/storage/manager.js';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(requireAuth);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Helper to fetch full notes with checklists, attachments, and hierarchical tags
async function fetchFullNotes(whereClause: string, params: any[] = [], orderBy: string = 'n.created_at DESC') {
  const sql = `
    SELECT 
      n.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', c.id,
          'note_id', c.note_id,
          'text', c.text,
          'is_completed', c.is_completed,
          'position', c.position,
          'created_at', c.created_at
        ) ORDER BY c.position ASC)
        FROM checklist_items c
        WHERE c.note_id = n.id
      ), '[]'::json) as checklist_items,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', a.id,
          'note_id', a.note_id,
          'filename', a.filename,
          'original_name', a.original_name,
          'mime_type', a.mime_type,
          'file_size', a.file_size,
          'width', a.width,
          'height', a.height,
          'thumbnail_filename', a.thumbnail_filename,
          'storage_provider', a.storage_provider,
          'created_at', a.created_at
        ) ORDER BY a.created_at ASC)
        FROM attachments a
        WHERE a.note_id = n.id
      ), '[]'::json) as attachments,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', t.id,
          'name', t.name,
          'parent_id', t.parent_id,
          'color', t.color,
          'sort_order', t.sort_order
        ) ORDER BY t.sort_order ASC, t.name ASC)
        FROM note_tags nt
        JOIN tags t ON nt.tag_id = t.id
        WHERE nt.note_id = n.id
      ), '[]'::json) as tags
    FROM notes n
    ${whereClause ? `WHERE ${whereClause}` : ''}
    ORDER BY ${orderBy}
  `;

  const result = await query(sql, params);
  
  return result.rows.map(note => ({
    ...note,
    checklist_items: note.checklist_items || [],
    attachments: note.attachments || [],
    tags: note.tags || [],
  }));
}

// GET /api/notes - Query notes with multi-label and date range filters
router.get('/', async (req, res) => {
  try {
    const {
      view = 'notes',
      tag,
      tag_ids,
      tag_match = 'and',
      date_from,
      date_to,
      date_field = 'created_at',
      color,
      q,
      has_images,
      has_files,
      has_checklist,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    // 1. View filter
    if (view === 'trash') {
      conditions.push('n.is_trashed = TRUE');
    } else if (view === 'archive') {
      conditions.push('n.is_trashed = FALSE AND n.is_archived = TRUE');
    } else if (view === 'starred') {
      conditions.push('n.is_trashed = FALSE AND n.is_archived = FALSE AND n.is_starred = TRUE');
    } else {
      // Default 'notes' (All Notes) view
      conditions.push('n.is_trashed = FALSE AND n.is_archived = FALSE');
    }

    // 2. Multi-label or single tag filter
    const targetTagIds: string[] = [];
    if (tag_ids) {
      if (Array.isArray(tag_ids)) {
        targetTagIds.push(...(tag_ids as string[]));
      } else if (typeof tag_ids === 'string') {
        targetTagIds.push(...tag_ids.split(',').map((s) => s.trim()).filter(Boolean));
      }
    } else if (tag) {
      targetTagIds.push(tag as string);
    }

    if (targetTagIds.length > 0) {
      params.push(targetTagIds);
      const pIdx = params.length;

      if (tag_match === 'and') {
        // Must contain all specified tags
        conditions.push(`n.id IN (
          SELECT nt.note_id 
          FROM note_tags nt
          WHERE nt.tag_id = ANY($${pIdx}::uuid[])
          GROUP BY nt.note_id
          HAVING COUNT(DISTINCT nt.tag_id) = ${targetTagIds.length}
        )`);
      } else {
        // Match any specified tag
        conditions.push(`n.id IN (
          SELECT nt.note_id 
          FROM note_tags nt
          WHERE nt.tag_id = ANY($${pIdx}::uuid[])
        )`);
      }
    }

    // 3. Date Range Filter
    const validDateFields = ['created_at', 'updated_at'];
    const fieldName = validDateFields.includes(date_field as string) ? (date_field as string) : 'created_at';

    if (date_from) {
      params.push(new Date(date_from as string));
      conditions.push(`n.${fieldName} >= $${params.length}`);
    }
    if (date_to) {
      const toDate = new Date(date_to as string);
      // If only date string without time, set to end of day
      if (typeof date_to === 'string' && date_to.length === 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      params.push(toDate);
      conditions.push(`n.${fieldName} <= $${params.length}`);
    }

    // 4. Color filter
    if (color && color !== 'all') {
      params.push(color);
      conditions.push(`n.color = $${params.length}`);
    }

    // 5. Full-text search
    if (q && typeof q === 'string' && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(
        LOWER(n.title) LIKE $${pIdx} 
        OR LOWER(n.content) LIKE $${pIdx}
        OR n.id IN (
          SELECT c.note_id FROM checklist_items c WHERE LOWER(c.text) LIKE $${pIdx}
        )
        OR n.id IN (
          SELECT a.note_id FROM attachments a WHERE LOWER(a.original_name) LIKE $${pIdx}
        )
      )`);
    }

    // 6. Type filters
    if (has_images === 'true') {
      conditions.push(`n.id IN (SELECT a.note_id FROM attachments a WHERE a.mime_type LIKE 'image/%')`);
    }
    if (has_files === 'true') {
      conditions.push(`n.id IN (SELECT a.note_id FROM attachments a WHERE a.mime_type NOT LIKE 'image/%')`);
    }
    if (has_checklist === 'true') {
      conditions.push(`n.id IN (SELECT c.note_id FROM checklist_items c)`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '';
    const notes = await fetchFullNotes(whereClause, params);

    res.json(notes);
  } catch (error: any) {
    console.error('Error querying notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes', details: error.message });
  }
});

// GET /api/notes/counts - Summary count of notes by category
router.get('/counts', async (req, res) => {
  try {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE is_trashed = FALSE AND is_archived = FALSE) as notes_count,
        COUNT(*) FILTER (WHERE is_trashed = FALSE AND is_archived = FALSE AND is_starred = TRUE) as starred_count,
        COUNT(*) FILTER (WHERE is_trashed = FALSE AND is_archived = TRUE) as archive_count,
        COUNT(*) FILTER (WHERE is_trashed = TRUE) as trash_count
      FROM notes;
    `;
    const result = await query(sql);
    const row = result.rows[0] || {};
    res.json({
      notes: parseInt(row.notes_count || '0', 10),
      starred: parseInt(row.starred_count || '0', 10),
      archive: parseInt(row.archive_count || '0', 10),
      trash: parseInt(row.trash_count || '0', 10),
    });
  } catch (err: any) {
    console.error('Error fetching note counts:', err);
    res.status(500).json({ error: 'Failed to fetch note counts', details: err.message });
  }
});

// GET /api/notes/:id - Get single note
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const notes = await fetchFullNotes('n.id = $1', [id]);
    if (notes.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(notes[0]);
  } catch (error: any) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note', details: error.message });
  }
});

// POST /api/notes - Create note
router.post('/', async (req, res) => {
  const {
    title = '',
    content = '',
    color = 'default',
    is_starred = false,
    is_archived = false,
    checklist_items = [],
    tag_ids = [],
    attachment_ids = [],
  } = req.body;

  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const userId = req.user?.id || null;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Insert note
    const noteResult = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, cleanTitle, content, color, is_starred, is_archived]
    );
    const newNote = noteResult.rows[0];

    // 2. Insert checklist items
    if (Array.isArray(checklist_items) && checklist_items.length > 0) {
      for (let i = 0; i < checklist_items.length; i++) {
        const item = checklist_items[i];
        if (typeof item.text === 'string') {
          await client.query(
            `INSERT INTO checklist_items (note_id, text, is_completed, position)
             VALUES ($1, $2, $3, $4)`,
            [newNote.id, item.text, !!item.is_completed, item.position ?? i]
          );
        }
      }
    }

    // 3. Link tags
    if (Array.isArray(tag_ids) && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newNote.id, tagId]
        );
      }
    }

    // 4. Link attachments
    if (Array.isArray(attachment_ids) && attachment_ids.length > 0) {
      for (const attId of attachment_ids) {
        await client.query(
          `UPDATE attachments SET note_id = $1 WHERE id = $2`,
          [newNote.id, attId]
        );
      }
    }

    await client.query('COMMIT');

    const fullNotes = await fetchFullNotes('n.id = $1', [newNote.id]);
    res.status(201).json(fullNotes[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note', details: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/notes/:id - Update note
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    content,
    color,
    is_starred,
    is_archived,
    is_trashed,
    checklist_items,
    tag_ids,
  } = req.body;

  // RBAC check: API user cannot trash notes via PUT
  if (is_trashed && req.user?.role === 'api') {
    return res.status(403).json({ error: 'Forbidden: API users cannot move notes to trash' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }

    const current = existing.rows[0];
    const finalTitle = title !== undefined ? (typeof title === 'string' ? title.trim() : '') : current.title;

    await client.query(
      `UPDATE notes SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        color = COALESCE($3, color),
        is_starred = COALESCE($4, is_starred),
        is_archived = COALESCE($5, is_archived),
        is_trashed = COALESCE($6, is_trashed),
        updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        finalTitle,
        content !== undefined ? content : current.content,
        color !== undefined ? color : current.color,
        is_starred !== undefined ? is_starred : current.is_starred,
        is_archived !== undefined ? is_archived : current.is_archived,
        is_trashed !== undefined ? is_trashed : current.is_trashed,
        id,
      ]
    );

    // Sync checklist items
    if (Array.isArray(checklist_items)) {
      await client.query('DELETE FROM checklist_items WHERE note_id = $1', [id]);
      for (let i = 0; i < checklist_items.length; i++) {
        const item = checklist_items[i];
        if (typeof item.text === 'string') {
          await client.query(
            `INSERT INTO checklist_items (note_id, text, is_completed, position)
             VALUES ($1, $2, $3, $4)`,
            [id, item.text, !!item.is_completed, item.position ?? i]
          );
        }
      }
    }

    // Sync tags
    if (Array.isArray(tag_ids)) {
      await client.query('DELETE FROM note_tags WHERE note_id = $1', [id]);
      for (const tagId of tag_ids) {
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, tagId]
        );
      }
    }

    await client.query('COMMIT');

    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note', details: error.message });
  } finally {
    client.release();
  }
});

// PATCH /api/notes/:id/star - Toggle star
router.patch('/:id/star', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE notes SET is_starred = NOT is_starred, is_archived = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to star note', details: error.message });
  }
});

// PATCH /api/notes/:id/archive - Toggle archive
router.patch('/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { is_archived } = req.body;
  try {
    const result = await query(
      `UPDATE notes SET 
        is_archived = COALESCE($1, NOT is_archived),
        is_starred = CASE WHEN COALESCE($1, NOT is_archived) = TRUE THEN FALSE ELSE is_starred END,
        updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [is_archived, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to archive note', details: error.message });
  }
});

// PATCH /api/notes/:id/trash - Move to trash or restore (API users cannot trash notes)
router.patch('/:id/trash', requireNotApiForDelete, async (req, res) => {
  const { id } = req.params;
  const { is_trashed } = req.body;
  try {
    const result = await query(
      `UPDATE notes SET 
        is_trashed = COALESCE($1, NOT is_trashed),
        is_starred = CASE WHEN COALESCE($1, NOT is_trashed) = TRUE THEN FALSE ELSE is_starred END,
        updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [is_trashed, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update trash status', details: error.message });
  }
});

// PATCH /api/notes/:id/color - Change color
router.patch('/:id/color', async (req, res) => {
  const { id } = req.params;
  const { color } = req.body;
  try {
    const result = await query(
      `UPDATE notes SET color = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [color || 'default', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update note color', details: error.message });
  }
});

// PATCH /api/notes/:id/checklist-item/:itemId - Toggle checklist item
router.patch('/:id/checklist-item/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { is_completed, text } = req.body;
  try {
    const result = await query(
      `UPDATE checklist_items SET
        is_completed = COALESCE($1, is_completed),
        text = COALESCE($2, text)
       WHERE id = $3 AND note_id = $4
       RETURNING *`,
      [is_completed, text, itemId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Checklist item not found' });
    await query('UPDATE notes SET updated_at = NOW() WHERE id = $1', [id]);
    const fullNotes = await fetchFullNotes('n.id = $1', [id]);
    res.json(fullNotes[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update checklist item', details: error.message });
  }
});

// POST /api/notes/:id/duplicate - Duplicate note
router.post('/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const noteRes = await client.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (noteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }
    const orig = noteRes.rows[0];

    const newNoteRes = await client.query(
      `INSERT INTO notes (user_id, title, content, color, is_starred, is_archived)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user?.id || orig.user_id,
        orig.title ? `${orig.title} (Copy)` : '',
        orig.content,
        orig.color,
        orig.is_starred,
        orig.is_archived,
      ]
    );
    const newNoteId = newNoteRes.rows[0].id;

    // Copy checklist items
    await client.query(
      `INSERT INTO checklist_items (note_id, text, is_completed, position)
       SELECT $1, text, is_completed, position FROM checklist_items WHERE note_id = $2`,
      [newNoteId, id]
    );

    // Copy tags
    await client.query(
      `INSERT INTO note_tags (note_id, tag_id)
       SELECT $1, tag_id FROM note_tags WHERE note_id = $2`,
      [newNoteId, id]
    );

    // Copy attachments
    await client.query(
      `INSERT INTO attachments (note_id, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, storage_path)
       SELECT $1, filename, original_name, mime_type, file_size, width, height, thumbnail_filename, storage_provider, storage_path FROM attachments WHERE note_id = $2`,
      [newNoteId, id]
    );

    await client.query('COMMIT');

    const fullNotes = await fetchFullNotes('n.id = $1', [newNoteId]);
    res.status(201).json(fullNotes[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to duplicate note', details: error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/notes/:id - Permanently delete note (FORBIDDEN for API users)
router.delete('/:id', requireNotApiForDelete, async (req, res) => {
  const { id } = req.params;
  try {
    // Find attachments to clean up from local disk and cloud storage (Google Drive, S3, R2, B2)
    const attResult = await query('SELECT filename, thumbnail_filename, storage_provider FROM attachments WHERE note_id = $1', [id]);
    for (const att of attResult.rows) {
      // 1. Local disk cleanup
      const filePath = path.join(UPLOAD_DIR, att.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      if (att.thumbnail_filename) {
        const thumbPath = path.join(THUMBNAIL_DIR, att.thumbnail_filename);
        if (fs.existsSync(thumbPath)) {
          try { fs.unlinkSync(thumbPath); } catch (e) {}
        }
      }
      // 2. Cloud storage cleanup (Google Drive / S3 / R2 / B2)
      if (att.storage_provider && att.storage_provider !== 'local') {
        try {
          await storageManager.delete(att.filename, att.storage_provider, 'attachments');
        } catch (cloudErr) {
          console.warn(`Failed to delete attachment ${att.filename} from ${att.storage_provider}:`, cloudErr);
        }
      }
      const activeType = storageManager.getActiveType();
      if (activeType !== 'local' && activeType !== att.storage_provider) {
        try {
          await storageManager.delete(att.filename, activeType, 'attachments');
        } catch (cloudErr) {}
      }
    }

    const result = await query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note permanently deleted', note: result.rows[0] });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note', details: error.message });
  }
});

// POST /api/notes/empty-trash - Empty all notes in trash (FORBIDDEN for API users)
router.post('/empty-trash', requireNotApiForDelete, async (req, res) => {
  try {
    const attResult = await query(`
      SELECT a.filename, a.thumbnail_filename, a.storage_provider 
      FROM attachments a
      JOIN notes n ON a.note_id = n.id
      WHERE n.is_trashed = TRUE
    `);

    for (const att of attResult.rows) {
      // 1. Local disk cleanup
      const filePath = path.join(UPLOAD_DIR, att.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      if (att.thumbnail_filename) {
        const thumbPath = path.join(THUMBNAIL_DIR, att.thumbnail_filename);
        if (fs.existsSync(thumbPath)) {
          try { fs.unlinkSync(thumbPath); } catch (e) {}
        }
      }
      // 2. Cloud storage cleanup (Google Drive / S3 / R2 / B2)
      if (att.storage_provider && att.storage_provider !== 'local') {
        try {
          await storageManager.delete(att.filename, att.storage_provider, 'attachments');
        } catch (cloudErr) {
          console.warn(`Failed to delete attachment ${att.filename} from ${att.storage_provider}:`, cloudErr);
        }
      }
      const activeType = storageManager.getActiveType();
      if (activeType !== 'local' && activeType !== att.storage_provider) {
        try {
          await storageManager.delete(att.filename, activeType, 'attachments');
        } catch (cloudErr) {}
      }
    }

    const result = await query('DELETE FROM notes WHERE is_trashed = TRUE');
    res.json({ message: 'Trash emptied successfully', deletedCount: result.rowCount });
  } catch (error: any) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ error: 'Failed to empty trash', details: error.message });
  }
});

export default router;
