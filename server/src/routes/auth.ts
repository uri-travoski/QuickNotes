import { Router } from 'express';
import { query } from '../db/index.js';
import { comparePassword, generateToken, requireAuth } from '../services/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.role === 'api') {
      return res.status(403).json({
        error: 'API accounts cannot log in to the web interface. Please authenticate with API keys.',
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        display_name: user.display_name,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.user) {
    return res.json({
      authenticated: false,
      user: null,
    });
  }

  res.json({
    authenticated: true,
    user: req.user,
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
