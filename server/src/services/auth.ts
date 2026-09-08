import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'quicknotes_jwt_secret_production_2026_super_key';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  username: string;
  role: 'owner' | 'api';
  display_name: string;
  authMethod?: 'jwt' | 'api_key';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token generation
export function generateToken(user: { id: string; username: string; role: 'owner' | 'api'; display_name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      display_name: decoded.display_name,
      authMethod: 'jwt',
    };
  } catch (error) {
    return null;
  }
}

// API Key generation (format: sk_qn_<random_24_hex>)
export function generateApiKey(): { apiKey: string; keyPrefix: string; keyHash: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const apiKey = `sk_qn_${randomBytes}`;
  const keyPrefix = apiKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  return { apiKey, keyPrefix, keyHash };
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Authentication Middleware (Supports Bearer JWT, X-API-Key, or Query token)
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  let authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);
  const queryToken = req.query.token as string;

  if (!authHeader && queryToken) {
    authHeader = `Bearer ${queryToken}`;
  }

  if (!authHeader) {
    return next();
  }

  // 1. Check if it's an API key (starts with sk_qn_, sk_saved_, or in x-api-key)
  if (
    authHeader.startsWith('sk_qn_') ||
    authHeader.startsWith('sk_saved_') ||
    authHeader.startsWith('Bearer sk_qn_') ||
    authHeader.startsWith('Bearer sk_saved_') ||
    req.headers['x-api-key']
  ) {
    const rawKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const keyHash = hashApiKey(rawKey);

    try {
      const result = await query(
        `SELECT k.*, u.id as user_id, u.username, u.role, u.display_name
         FROM api_keys k
         JOIN users u ON k.user_id = u.id
         WHERE k.key_hash = $1 AND (k.expires_at IS NULL OR k.expires_at > NOW())`,
        [keyHash]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        // Touch last_used_at
        await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]);

        req.user = {
          id: row.user_id,
          username: row.username,
          role: row.role,
          display_name: row.display_name,
          authMethod: 'api_key',
        };
        return next();
      } else {
        return res.status(401).json({ error: 'Invalid or expired API key' });
      }
    } catch (err) {
      console.error('Error validating API key:', err);
      return res.status(500).json({ error: 'Authentication error' });
    }
  }

  // 2. Check if it's a JWT Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    } else {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  next();
}

// Require authenticated user
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Require Owner role
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden: Owner role required for this action' });
  }
  next();
}

// Block API users from deleting notes or emptying trash
export function requireNotApiForDelete(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'api') {
    return res.status(403).json({
      error: 'Forbidden: API users are not permitted to delete notes or empty trash',
    });
  }
  next();
}

// Allow Label management (list/create/update) for both Owner and API roles
export function requireLabelAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Both 'owner' and 'api' are allowed
  if (req.user.role !== 'owner' && req.user.role !== 'api') {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for label management' });
  }
  next();
}

// Block API users from deleting labels (Owner only)
export function requireNotApiForLabelDelete(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'api') {
    return res.status(403).json({
      error: 'Forbidden: API users are not permitted to delete labels',
    });
  }
  next();
}
