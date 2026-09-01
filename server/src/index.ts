import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import notesRouter from './routes/notes.js';
import tagsRouter from './routes/tags.js';
import attachmentsRouter from './routes/attachments.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import apiKeysRouter from './routes/apiKeys.js';
import apiDocsRouter from './routes/apiDocs.js';
import storageRouter from './routes/storage.js';
import backupsRouter from './routes/backups.js';
import { migrate } from './db/migrate.js';
import { authenticateToken } from './services/auth.js';
import { startBackupScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const CLIENT_DIST_DIR = process.env.CLIENT_DIST_DIR || path.join(process.cwd(), 'client-dist');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(path.join(UPLOAD_DIR, 'thumbnails'))) fs.mkdirSync(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global Authentication Middleware (Extracts JWT token, API key, or query token)
app.use(authenticateToken);

// Static file serving for uploaded files and thumbnails
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webp') || filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/docs', apiDocsRouter);
app.use('/api/storage', storageRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/attachments', attachmentsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'quicknotes-backend-2026',
    nodeVersion: process.version,
    user: req.user || null,
  });
});

// Static frontend serving and Single-Page Application (SPA) routing
if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // SPA fallback for non-API and non-uploads routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
async function startServer() {
  try {
    await migrate();
    startBackupScheduler();
    app.listen(PORT, () => {
      console.log(`🚀 QuickNotes Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
