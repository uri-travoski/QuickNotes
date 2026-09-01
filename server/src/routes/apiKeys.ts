import { Router } from 'express';
import { query } from '../db/index.js';
import { generateApiKey, requireOwner } from '../services/auth.js';

const router = Router();

// API Key management requires Owner role
router.use(requireOwner);

// GET /api/api-keys - List all API keys
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT k.id, k.name, k.key_prefix, k.last_used_at, k.expires_at, k.created_at,
              u.id as user_id, u.username, u.role, u.display_name
       FROM api_keys k
       JOIN users u ON k.user_id = u.id
       ORDER BY k.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys', details: error.message });
  }
});

// POST /api/api-keys - Create a new API key
router.post('/', async (req, res) => {
  const { name, user_id, expires_in_days } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Key name is required' });
  }

  const targetUserId = user_id || req.user?.id;
  const userRes = await query('SELECT id, username, role FROM users WHERE id = $1', [targetUserId]);
  if (userRes.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { apiKey, keyPrefix, keyHash } = generateApiKey();

  let expiresAt: Date | null = null;
  if (expires_in_days && Number(expires_in_days) > 0) {
    expiresAt = new Date(Date.now() + Number(expires_in_days) * 86400000);
  }

  try {
    const result = await query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, last_used_at, expires_at, created_at`,
      [targetUserId, name.trim(), keyPrefix, keyHash, expiresAt]
    );

    // Return the full apiKey ONCE
    res.status(201).json({
      ...result.rows[0],
      apiKey, // Full secret key
      user: userRes.rows[0],
      message: 'Store this API key safely. You will not be able to see it again.',
    });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key', details: error.message });
  }
});

// DELETE /api/api-keys/:id - Revoke an API key
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM api_keys WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ message: 'API key revoked successfully', key: result.rows[0] });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key', details: error.message });
  }
});

export default router;
