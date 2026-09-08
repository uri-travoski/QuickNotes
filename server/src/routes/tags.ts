import { Router } from 'express';
import { query } from '../db/index.js';
import { requireLabelAccess, requireNotApiForLabelDelete } from '../services/auth.js';

const router = Router();
router.use(requireLabelAccess);

// GET /api/tags - Get all tags with parent info, children tree, and note counts
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        t.*,
        p.name as parent_name,
        COUNT(DISTINCT n.id)::int as note_count
      FROM tags t
      LEFT JOIN tags p ON t.parent_id = p.id
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      LEFT JOIN notes n ON nt.note_id = n.id AND n.is_trashed = FALSE
      GROUP BY t.id, p.name, p.sort_order
      ORDER BY COALESCE(p.sort_order, t.sort_order) ASC, t.parent_id NULLS FIRST, t.sort_order ASC, t.name ASC
    `);

    const flatTags = result.rows;

    // Build hierarchical tree
    const rootTags = flatTags.filter((t) => !t.parent_id);
    const subTags = flatTags.filter((t) => !!t.parent_id);

    const tree = rootTags.map((root) => ({
      ...root,
      children: subTags.filter((sub) => sub.parent_id === root.id),
    }));

    res.json({
      flat: flatTags,
      tree,
    });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags', details: error.message });
  }
});

// POST /api/tags - Create a new tag (Root or 2nd-level Sub-tag)
router.post('/', requireLabelAccess, async (req, res) => {
  const { name, parent_id = null, color = 'default', sort_order = 0 } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  const cleanName = name.trim();
  const cleanParentId = parent_id ? parent_id : null;

  try {
    // If parent_id is provided, enforce 2-step nesting limit
    if (cleanParentId) {
      const parentCheck = await query('SELECT id, parent_id FROM tags WHERE id = $1', [cleanParentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent tag not found' });
      }
      if (parentCheck.rows[0].parent_id) {
        return res.status(400).json({
          error: 'Nested labels cannot exceed 2 levels (sub-labels cannot have children)',
        });
      }
    }

    // Check duplicate
    const existing = await query(
      `SELECT * FROM tags 
       WHERE LOWER(name) = LOWER($1) AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))`,
      [cleanName, cleanParentId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A label with this name already exists in this folder' });
    }

    const result = await query(
      `INSERT INTO tags (name, parent_id, color, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cleanName, cleanParentId, color, sort_order]
    );

    res.status(201).json({ ...result.rows[0], note_count: 0 });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag', details: error.message });
  }
});

// PUT /api/tags/:id - Update tag name, parent, color, or sort order
router.put('/:id', requireLabelAccess, async (req, res) => {
  const { id } = req.params;
  const { name, parent_id, color, sort_order } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  const cleanName = name.trim();
  const cleanParentId = parent_id !== undefined ? (parent_id ? parent_id : null) : undefined;

  try {
    // 1. Check self reference
    if (cleanParentId && cleanParentId === id) {
      return res.status(400).json({ error: 'A label cannot be its own parent' });
    }

    // 2. If parent_id is provided, verify it is a root tag (level 1)
    if (cleanParentId) {
      const parentCheck = await query('SELECT id, parent_id FROM tags WHERE id = $1', [cleanParentId]);
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent tag not found' });
      }
      if (parentCheck.rows[0].parent_id) {
        return res.status(400).json({
          error: 'Nested labels cannot exceed 2 levels (sub-labels cannot have children)',
        });
      }

      // Check if current tag has children (if it does, it cannot become a child of another tag)
      const childrenCheck = await query('SELECT COUNT(*)::int as count FROM tags WHERE parent_id = $1', [id]);
      if (childrenCheck.rows[0].count > 0) {
        return res.status(400).json({
          error: 'Cannot make a parent label into a sub-label while it still has child labels. Un-nest its children first.',
        });
      }
    }

    // Check duplicate
    const checkDuplicate = await query(
      `SELECT id FROM tags 
       WHERE LOWER(name) = LOWER($1) 
         AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))
         AND id != $3`,
      [cleanName, cleanParentId, id]
    );
    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({ error: 'Another label with this name already exists in this folder' });
    }

    const result = await query(
      `UPDATE tags SET 
         name = $1,
         parent_id = COALESCE($2, parent_id),
         color = COALESCE($3, color),
         sort_order = COALESCE($4, sort_order)
       WHERE id = $5
       RETURNING *`,
      [cleanName, cleanParentId, color, sort_order, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag', details: error.message });
  }
});

// DELETE /api/tags/:id - Delete tag (FORBIDDEN for API users - Owner only)
router.delete('/:id', requireNotApiForLabelDelete, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ message: 'Tag deleted successfully', tag: result.rows[0] });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag', details: error.message });
  }
});

export default router;
