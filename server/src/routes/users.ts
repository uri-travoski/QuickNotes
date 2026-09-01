import { Router } from 'express';
import { query } from '../db/index.js';
import { hashPassword, requireOwner } from '../services/auth.js';

const router = Router();

// All user management routes require Owner role
router.use(requireOwner);

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, role, display_name, created_at, updated_at
       FROM users
       ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// POST /api/users - Create a new user
router.post('/', async (req, res) => {
  const { username, password, role = 'api', display_name = '' } = req.body;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (role !== 'owner' && role !== 'api') {
    return res.status(400).json({ error: 'Role must be either "owner" or "api"' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (username, password_hash, role, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, display_name, created_at, updated_at`,
      [username.trim(), passwordHash, role, display_name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// PUT /api/users/:id - Update user role or display name
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { role, display_name } = req.body;

  if (role && role !== 'owner' && role !== 'api') {
    return res.status(400).json({ error: 'Role must be either "owner" or "api"' });
  }

  try {
    // If changing role of an owner to api, make sure at least one other owner exists
    if (role === 'api') {
      const ownerCountRes = await query('SELECT COUNT(*)::int as count FROM users WHERE role = $1 AND id != $2', ['owner', id]);
      if (ownerCountRes.rows[0].count === 0) {
        return res.status(400).json({ error: 'Cannot demote the only remaining Owner user' });
      }
    }

    const result = await query(
      `UPDATE users SET
         role = COALESCE($1, role),
         display_name = COALESCE($2, display_name),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, role, display_name, created_at, updated_at`,
      [role, display_name !== undefined ? display_name.trim() : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// PATCH /api/users/:id/password - Change user password
router.patch('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    return res.status(400).json({ error: 'Cannot delete your own user account' });
  }

  try {
    const userRes = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userRes.rows[0].role === 'owner') {
      const countRes = await query('SELECT COUNT(*)::int as count FROM users WHERE role = $1', ['owner']);
      if (countRes.rows[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only Owner user' });
      }
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

export default router;
