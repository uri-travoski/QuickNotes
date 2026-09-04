import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { storageManager } from '../services/storage/manager.js';
import { GoogleDriveStorageProvider } from '../services/storage/gdrive.js';
import { requireOwner } from '../services/auth.js';
import { query } from '../db/index.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const router = Router();

// =========================================================================
// 1. Google OAuth 2.0 Browser Callback (Public: Called directly by Google)
// =========================================================================
router.get('/gdrive/oauth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error || !code) {
    const errorMsg = (error_description || error || 'Authorization was cancelled or failed').toString();
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Drive Connection Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #202124; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #2d2e30; border: 1px solid #5f6368; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
          h2 { color: #ea4335; margin-top: 0; }
          p { color: #9aa0a6; font-size: 14px; line-height: 1.5; }
          button { background: #ea4335; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Connection Failed</h2>
          <p>${escapeHtml(errorMsg)}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GDRIVE_OAUTH_ERROR', message: ${JSON.stringify(errorMsg)} }, '*');
          }
        </script>
      </body>
      </html>
    `);
  }

  try {
    // 1. Retrieve stored Client ID and Secret from storage_configs or environment
    const storedConfigRes = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
    const prevConfig = storedConfigRes.rows[0]?.config_json || {};

    // Determine redirect URI and credentials used (extracted directly from state payload or database/env)
    const { state } = req.query;
    let redirectUri = '';
    let stateClientId: string | undefined;
    let stateClientSecret: string | undefined;

    if (typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded?.redirectUri) redirectUri = decoded.redirectUri;
        if (decoded?.clientId) stateClientId = decoded.clientId;
        if (decoded?.clientSecret) stateClientSecret = decoded.clientSecret;
      } catch (e) {
        // state was plain string
      }
    }

    if (!redirectUri) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
      redirectUri = `${protocol}://${host}/api/storage/gdrive/oauth/callback`;
    }

    const clientId = stateClientId || prevConfig.client_id || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = stateClientSecret || prevConfig.client_secret || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth Client ID or Client Secret is not configured in QuickNotes settings.');
    }

    // 2. Exchange authorization code for refresh & access tokens and fetch email (OAuth 2.0)
    const tokenResult = await GoogleDriveStorageProvider.exchangeOAuthCode(
      code.toString(),
      clientId,
      clientSecret,
      redirectUri
    );

    const effectiveRefreshToken = tokenResult.refresh_token || prevConfig.refresh_token;

    if (!effectiveRefreshToken) {
      throw new Error('Google did not return a refresh token. Please remove app permissions in your Google Account security settings and re-connect to grant offline access.');
    }

    // 3. Save to database and set Google Drive as active provider
    await storageManager.saveConfig(
      'gdrive',
      {
        ...prevConfig,
        auth_mode: 'oauth',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: effectiveRefreshToken,
        connected_email: tokenResult.email || 'Connected Google Account',
        folder_id: prevConfig.folder_id || 'root',
      },
      true // set_active = true
    );

    const email = tokenResult.email || 'your Google account';

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Drive Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #202124; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #2d2e30; border: 1px solid #5f6368; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
          .check { width: 48px; height: 48px; background: rgba(52, 168, 83, 0.2); color: #34a853; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto 16px; }
          h2 { color: #34a853; margin-top: 0; margin-bottom: 8px; }
          p { color: #9aa0a6; font-size: 14px; line-height: 1.5; margin: 8px 0; }
          strong { color: #fff; }
          button { background: #34a853; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="check">✓</div>
          <h2>Connected to Google Drive</h2>
          <p>QuickNotes is now connected to <strong>${escapeHtml(email)}</strong>.</p>
          <p style="font-size: 12px; color: #5f6368;">All note attachments will automatically save to Google Drive.</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GDRIVE_OAUTH_SUCCESS', email: ${JSON.stringify(email)} }, '*');
            setTimeout(() => window.close(), 1200);
          } else {
            setTimeout(() => window.location.href = '/?tab=storage', 1500);
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Drive Connection Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #202124; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #2d2e30; border: 1px solid #5f6368; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
          h2 { color: #ea4335; margin-top: 0; }
          p { color: #9aa0a6; font-size: 14px; line-height: 1.5; }
          button { background: #ea4335; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Connection Error</h2>
          <p>${escapeHtml(err.message || 'Unknown error occurred while connecting Google Drive.')}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GDRIVE_OAUTH_ERROR', message: ${JSON.stringify(err.message || 'Error')} }, '*');
          }
        </script>
      </body>
      </html>
    `);
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =========================================================================
// 2. Protected Storage Management Endpoints (Owner Only)
// =========================================================================
router.use(requireOwner);

// GET /api/storage/gdrive/oauth/url - Generate Google OAuth consent URL
router.get('/gdrive/oauth/url', async (req, res) => {
  try {
    const { client_id, client_secret, redirect_uri } = req.query;

    const storedConfigRes = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
    const prevConfig = storedConfigRes.rows[0]?.config_json || {};

    const effectiveClientId = (client_id as string) || prevConfig.client_id || process.env.GOOGLE_CLIENT_ID;
    const effectiveClientSecret = (client_secret as string) || prevConfig.client_secret || process.env.GOOGLE_CLIENT_SECRET;

    if (!effectiveClientId) {
      return res.status(400).json({
        error: 'Google Client ID is required to generate the authorization URL. Enter it in Settings or set GOOGLE_CLIENT_ID.',
      });
    }

    // Save Client ID / Secret if passed in request so callback can use it
    if (client_id || client_secret) {
      await storageManager.saveConfig('gdrive', {
        ...prevConfig,
        client_id: effectiveClientId,
        ...(client_secret && !client_secret.toString().includes('••') ? { client_secret: effectiveClientSecret } : {}),
      }, false);
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const effectiveRedirectUri = (redirect_uri as string) || `${protocol}://${host}/api/storage/gdrive/oauth/callback`;

    // Generate compact OAuth 2.0 State with redirectUri and random nonce
    const statePayload = {
      rnd: crypto.randomBytes(8).toString('hex'),
      redirectUri: effectiveRedirectUri,
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', effectiveClientId.trim());
    googleAuthUrl.searchParams.set('redirect_uri', effectiveRedirectUri.trim());
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    googleAuthUrl.searchParams.set('state', state);

    const authUrl = googleAuthUrl.toString();

    res.json({
      url: authUrl,
      redirect_uri: effectiveRedirectUri,
      client_id: effectiveClientId,
      state,
    });
  } catch (error: any) {
    console.error('Error generating Google OAuth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/storage/gdrive/oauth/disconnect - Disconnect Google account and revert to local storage
router.post('/gdrive/oauth/disconnect', async (req, res) => {
  try {
    const storedConfigRes = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
    const prevConfig = storedConfigRes.rows[0]?.config_json || {};

    // Revoke token on Google servers if present (OAuth 2.1 Clean Disconnect)
    if (prevConfig.refresh_token) {
      try {
        await GoogleDriveStorageProvider.revokeOAuthToken(prevConfig.refresh_token);
      } catch (err) {
        console.warn('Google token revocation notice:', err);
      }
    }

    // Clear OAuth token fields while retaining client_id if desired
    await storageManager.saveConfig('gdrive', {
      client_id: prevConfig.client_id,
      client_secret: prevConfig.client_secret,
      folder_id: prevConfig.folder_id,
      auth_mode: 'oauth',
      refresh_token: null,
      connected_email: null,
    }, false);

    // If Google Drive was active, revert to local
    if (storageManager.getActiveType() === 'gdrive') {
      await storageManager.setActive('local');
    }

    res.json({ message: 'Google Drive account disconnected successfully' });
  } catch (error: any) {
    console.error('Error disconnecting Google Drive:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/storage/gdrive/create-folder - Create dedicated folder in Google Drive
router.post('/gdrive/create-folder', async (req, res) => {
  try {
    const { name } = req.body;
    const folderName = name?.trim() || 'QuickNotes';

    const provider = storageManager.getProvider('gdrive') as GoogleDriveStorageProvider;
    if (!provider) {
      return res.status(400).json({ error: 'Google Drive provider is not initialized' });
    }

    const folder = await provider.createFolder(folderName);

    // Save newly created folder ID to storage_configs
    const storedConfigRes = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
    const prevConfig = storedConfigRes.rows[0]?.config_json || {};
    await storageManager.saveConfig('gdrive', {
      ...prevConfig,
      folder_id: folder.id,
    }, false);

    res.json({
      success: true,
      folderId: folder.id,
      folderName: folder.name,
      message: `Folder "${folder.name}" created successfully in Google Drive`,
    });
  } catch (error: any) {
    console.error('Error creating Google Drive folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/storage/configs - List all storage configurations & active provider
router.get('/configs', async (req, res) => {
  try {
    const configs = await storageManager.getAllConfigs();

    // Mask sensitive keys before returning
    const safeConfigs = configs.map((c) => {
      const cfg = { ...c.config };
      if (cfg.secret_access_key) {
        cfg.secret_access_key = '••••••••' + (cfg.secret_access_key.length > 4 ? cfg.secret_access_key.slice(-4) : '');
      }
      if (cfg.private_key) {
        cfg.private_key = '••••••••' + (cfg.private_key.length > 8 ? cfg.private_key.slice(-8) : '');
      }
      if (cfg.client_secret) {
        cfg.client_secret = '••••••••';
      }
      if (cfg.refresh_token) {
        cfg.has_refresh_token = true;
        cfg.refresh_token = '••••••••' + (cfg.refresh_token.length > 6 ? cfg.refresh_token.slice(-6) : '');
      }
      if (cfg.service_account_json) {
        cfg.service_account_json_configured = true;
        cfg.service_account_json = undefined;
      }
      return {
        ...c,
        config: cfg,
      };
    });

    res.json({
      active_provider: storageManager.getActiveType(),
      providers: safeConfigs,
    });
  } catch (error: any) {
    console.error('Error fetching storage configs:', error);
    res.status(500).json({ error: 'Failed to fetch storage configs', details: error.message });
  }
});

// POST /api/storage/test - Test connection to a storage provider
router.post('/test', async (req, res) => {
  const { provider_type, config } = req.body;

  if (!provider_type || !['local', 's3', 'gdrive'].includes(provider_type)) {
    return res.status(400).json({ error: 'Invalid provider type (must be local, s3, or gdrive)' });
  }

  try {
    const result = await storageManager.testProvider(provider_type, config);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: `Connection test error: ${error.message}`,
    });
  }
});

// PUT /api/storage/configs/:provider - Save configuration for a provider
router.put('/configs/:provider', async (req, res) => {
  const { provider } = req.params;
  const { config, set_active } = req.body;

  if (!['local', 's3', 'gdrive'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider type' });
  }

  try {
    await storageManager.saveConfig(provider as any, config, !!set_active);
    res.json({ message: `Storage configuration for ${provider} saved successfully` });
  } catch (error: any) {
    console.error('Error saving storage config:', error);
    res.status(500).json({ error: 'Failed to save storage config', details: error.message });
  }
});

// POST /api/storage/active - Set the active storage provider
router.post('/active', async (req, res) => {
  const { provider_type } = req.body;

  if (!['local', 's3', 'gdrive'].includes(provider_type)) {
    return res.status(400).json({ error: 'Invalid provider type' });
  }

  try {
    await storageManager.setActive(provider_type as any);
    res.json({ message: `Active storage provider set to ${provider_type}`, active_provider: provider_type });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/storage/sync - Sync local attachments to active cloud storage (Google Drive / S3)
router.post('/sync', async (req, res) => {
  try {
    await storageManager.initialize();
    const activeType = storageManager.getActiveType();

    if (activeType === 'local') {
      return res.status(400).json({ error: 'Cannot sync to Local Storage. Please activate Google Drive or S3 first.' });
    }

    // Find all attachments in database
    const result = await query(`
      SELECT id, note_id, filename, original_name, mime_type, file_size, storage_provider, storage_path
      FROM attachments
      ORDER BY created_at ASC
    `);

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const att of result.rows) {
      const filePath = path.join(UPLOAD_DIR, att.filename);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const fileContent = fs.readFileSync(filePath);
        const uploadRes = await storageManager.upload(
          att.filename,
          fileContent,
          att.mime_type || 'application/octet-stream',
          'attachments'
        );
        await query(
          `UPDATE attachments SET storage_provider = $1, storage_path = $2, updated_at = NOW() WHERE id = $3`,
          [uploadRes.storageProvider, uploadRes.storagePath, att.id]
        );
        syncedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`${att.original_name || att.filename}: ${err.message}`);
        console.error(`Failed to sync attachment ${att.filename} to ${activeType}:`, err);
      }
    }

    res.json({
      message: `Sync completed: ${syncedCount} file(s) synced to ${activeType.toUpperCase()}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      syncedCount,
      failedCount,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Error during storage sync:', error);
    res.status(500).json({ error: 'Failed to sync attachments', details: error.message });
  }
});

export default router;
