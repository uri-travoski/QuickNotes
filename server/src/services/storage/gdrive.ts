import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';
import { StorageProvider, StorageStats, FileMetadata, TestResult } from './base.js';

export interface GDriveConfig {
  folder_id?: string;
  client_email?: string;
  private_key?: string;
  service_account_json?: string;
  oauth_access_token?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  connected_email?: string;
  auth_mode?: 'oauth' | 'service_account';
}

function extractFolderId(input?: string): string {
  if (!input || !input.trim()) return 'root';
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return trimmed;
}

export class GoogleDriveStorageProvider implements StorageProvider {
  private folderId: string;
  private clientEmail: string;
  private privateKey: string;
  private serviceAccountJson: string;
  private oauthAccessToken: string;
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private connectedEmail: string;
  private authMode: 'service_account' | 'oauth';

  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private fileIdCache: Map<string, string> = new Map();

  constructor(config: GDriveConfig) {
    this.folderId = extractFolderId(config.folder_id);
    this.clientEmail = config.client_email || '';
    this.privateKey = config.private_key || '';
    this.serviceAccountJson = config.service_account_json || '';
    this.oauthAccessToken = config.oauth_access_token || '';
    this.clientId = config.client_id || '';
    this.clientSecret = config.client_secret || '';
    this.refreshToken = config.refresh_token || '';
    this.connectedEmail = config.connected_email || '';
    if (config.auth_mode) {
      this.authMode = config.auth_mode;
    } else if (config.service_account_json || config.client_email || config.private_key) {
      this.authMode = 'service_account';
    } else if (config.refresh_token || config.client_id) {
      this.authMode = 'oauth';
    } else {
      this.authMode = 'service_account';
    }
  }

  get providerType(): string {
    return 'gdrive';
  }

  get displayName(): string {
    return 'Google Drive Storage';
  }

  public getConnectedEmail(): string {
    return this.connectedEmail;
  }

  public getAuthMode(): 'oauth' | 'service_account' {
    return this.authMode;
  }

  public static async exchangeOAuthCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token: string; email?: string; expires_in?: number }> {
    const params: Record<string, string> = {
      code: code.trim(),
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      redirect_uri: redirectUri.trim(),
      grant_type: 'authorization_code',
    };
    const postData = new URLSearchParams(params).toString();

    const tokenRes = await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
      const parsedUrl = new URL('https://oauth2.googleapis.com/token');
      const req = https.request(
        {
          method: 'POST',
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode || 200, body: Buffer.concat(chunks) }));
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    let tokenJson: any = {};
    try {
      tokenJson = JSON.parse(tokenRes.body.toString('utf8'));
    } catch {
      tokenJson = { error: tokenRes.body.toString('utf8') };
    }

    if (!tokenJson.access_token) {
      const detail = tokenJson.error_description
        ? `${tokenJson.error}: ${tokenJson.error_description}`
        : (tokenJson.error || `Failed to exchange authorization code with Google (Status ${tokenRes.status})`);
      console.error('Google token exchange error details:', {
        status: tokenRes.status,
        error: tokenJson,
        redirectUriUsed: redirectUri,
      });
      throw new Error(detail);
    }

    let email: string | undefined;
    if (tokenJson.access_token) {
      try {
        const userRes = await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
          const userUrl = new URL('https://www.googleapis.com/oauth2/v2/userinfo');
          const req = https.request(
            {
              method: 'GET',
              hostname: userUrl.hostname,
              path: userUrl.pathname,
              headers: {
                Authorization: `Bearer ${tokenJson.access_token}`,
              },
            },
            (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => resolve({ status: res.statusCode || 200, body: Buffer.concat(chunks) }));
            }
          );
          req.on('error', reject);
          req.end();
        });
        const userJson = JSON.parse(userRes.body.toString('utf8'));
        if (userJson.email) {
          email = userJson.email;
        }
      } catch (err) {
        console.warn('Could not fetch user email from Google userinfo API:', err);
      }
    }

    return {
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      email,
      expires_in: tokenJson.expires_in,
    };
  }

  public static async revokeOAuthToken(token: string): Promise<boolean> {
    try {
      const postData = new URLSearchParams({ token }).toString();
      const res = await new Promise<{ status: number; body: Buffer }>((resolve, reject) => {
        const parsedUrl = new URL('https://oauth2.googleapis.com/revoke');
        const req = https.request(
          {
            method: 'POST',
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode || 200, body: Buffer.concat(chunks) }));
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
      return res.status === 200;
    } catch (err) {
      console.warn('Could not revoke Google OAuth token:', err);
      return false;
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiry - 60000) {
      return this.cachedToken;
    }

    // 1. OAuth 2.0 Flow (Prioritized when auth_mode is oauth or when refresh_token exists)
    if (this.authMode === 'oauth' || (this.refreshToken && this.clientId && this.clientSecret)) {
      if (this.oauthAccessToken && now < this.tokenExpiry) {
        this.cachedToken = this.oauthAccessToken;
        return this.oauthAccessToken;
      }

      if (this.refreshToken && this.clientId && this.clientSecret) {
        try {
          const postData = new URLSearchParams({
            client_id: this.clientId.trim(),
            client_secret: this.clientSecret.trim(),
            refresh_token: this.refreshToken.trim(),
            grant_type: 'refresh_token',
          }).toString();

          const res = await this.httpRequest('POST', 'https://oauth2.googleapis.com/token', Buffer.from(postData), {
            'Content-Type': 'application/x-www-form-urlencoded',
          });

          let resJson: any = {};
          try {
            resJson = JSON.parse(res.body.toString('utf8'));
          } catch {
            resJson = { error: res.body.toString('utf8') };
          }

          if (!resJson.access_token) {
            const detail = resJson.error_description
              ? `${resJson.error}: ${resJson.error_description}`
              : (resJson.error || 'Failed to refresh OAuth token');
            throw new Error(detail);
          }

          this.cachedToken = resJson.access_token;
          this.tokenExpiry = now + (resJson.expires_in || 3600) * 1000;
          return resJson.access_token;
        } catch (err: any) {
          throw new Error(`OAuth Refresh Error: ${err.message}`);
        }
      }
    }

    // 2. Service Account Flow
    let clientEmail = this.clientEmail;
    let privateKey = this.privateKey;
    let tokenUri = 'https://oauth2.googleapis.com/token';

    if ((!clientEmail || !privateKey) && this.serviceAccountJson) {
      try {
        const creds = typeof this.serviceAccountJson === 'string'
          ? JSON.parse(this.serviceAccountJson)
          : this.serviceAccountJson;

        clientEmail = clientEmail || creds.client_email;
        privateKey = privateKey || creds.private_key;
        tokenUri = creds.token_uri || tokenUri;
      } catch (err: any) {
        throw new Error(`Service Account JSON Error: ${err.message}`);
      }
    }

    if (clientEmail && privateKey) {
      const formattedKey = privateKey.includes('\\n')
        ? privateKey.replace(/\\n/g, '\n')
        : privateKey;

      const token = await this.exchangeServiceAccountJwt(clientEmail.trim(), formattedKey.trim(), tokenUri);
      this.cachedToken = token;
      this.tokenExpiry = now + 3500 * 1000;
      return token;
    }

    // 3. Direct OAuth Token fallback
    if (this.oauthAccessToken) {
      return this.oauthAccessToken;
    }

    throw new Error('Google Drive credentials not configured (Service Account JSON or OAuth token required).');
  }

  private async exchangeServiceAccountJwt(clientEmail: string, privateKey: string, tokenUri: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
      aud: tokenUri,
      exp: now + 3600,
      iat: now,
    };

    const b64Url = (str: string) => Buffer.from(str).toString('base64url');

    const unsignedToken = `${b64Url(JSON.stringify(header))}.${b64Url(JSON.stringify(claims))}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign(privateKey, 'base64url');
    const jwtAssertion = `${unsignedToken}.${signature}`;

    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion,
    }).toString();

    const res = await this.httpRequest('POST', tokenUri, Buffer.from(postData), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const resJson = JSON.parse(res.body.toString('utf8'));
    if (!resJson.access_token) {
      throw new Error(resJson.error_description || 'Failed to exchange service account JWT');
    }
    return resJson.access_token;
  }

  private httpRequest(
    method: string,
    urlStr: string,
    body: Buffer = Buffer.alloc(0),
    headers: Record<string, string> = {}
  ): Promise<{ statusCode: number; headers: any; body: Buffer }> {
    const parsedUrl = new URL(urlStr);
    return new Promise((resolve, reject) => {
      const req = https.request(
        parsedUrl,
        {
          method,
          headers: {
            ...headers,
            'Content-Length': body.length.toString(),
          },
          timeout: 20000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode || 500,
              headers: res.headers,
              body: Buffer.concat(chunks),
            });
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google Drive request timed out'));
      });

      if (body.length > 0) req.write(body);
      req.end();
    });
  }

  private async findFileId(filename: string): Promise<string | null> {
    if (this.fileIdCache.has(filename)) {
      return this.fileIdCache.get(filename)!;
    }

    const token = await this.getAccessToken();
    const escapedFilename = filename.replace(/'/g, "\\'");
    
    // First try searching inside the specified folder
    let query = encodeURIComponent(`name = '${escapedFilename}' and '${this.folderId}' in parents and trashed = false`);
    let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    let res = await this.httpRequest('GET', url, Buffer.alloc(0), {
      Authorization: `Bearer ${token}`,
    });

    if (res.statusCode === 200) {
      const data = JSON.parse(res.body.toString('utf8'));
      if (data.files && data.files.length > 0) {
        const id = data.files[0].id;
        this.fileIdCache.set(filename, id);
        return id;
      }
    }

    // Fallback: search globally across all accessible files if not found in folder
    const globalQuery = encodeURIComponent(`name = '${escapedFilename}' and trashed = false`);
    const globalUrl = `https://www.googleapis.com/drive/v3/files?q=${globalQuery}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    res = await this.httpRequest('GET', globalUrl, Buffer.alloc(0), {
      Authorization: `Bearer ${token}`,
    });

    if (res.statusCode === 200) {
      const data = JSON.parse(res.body.toString('utf8'));
      if (data.files && data.files.length > 0) {
        const id = data.files[0].id;
        this.fileIdCache.set(filename, id);
        return id;
      }
    }

    return null;
  }

  async uploadFile(filename: string, content: Buffer, mimeType: string, prefix?: string): Promise<string> {
    const token = await this.getAccessToken();
    const boundary = 'QuickNotesDriveBoundary' + crypto.randomBytes(8).toString('hex');

    const effectiveFolder = this.folderId && this.folderId !== 'root' ? this.folderId : undefined;
    const metadata: any = {
      name: filename,
      properties: {
        prefix: prefix || '',
        uploadedAt: new Date().toISOString(),
      },
    };
    if (effectiveFolder) {
      metadata.parents = [effectiveFolder];
    }

    const headerPart = Buffer.from(
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    );
    const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([headerPart, content, footerPart]);

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,webContentLink&supportsAllDrives=true';
    const res = await this.httpRequest('POST', url, multipartBody, {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    });

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      // If folder upload failed (e.g. invalid folder ID or inaccessible parent), retry at root
      if (effectiveFolder) {
        console.warn(`Upload to folder ${effectiveFolder} returned ${res.statusCode}. Retrying upload in root folder...`);
        const fallbackHeader = Buffer.from(
          `--${boundary}\r\n` +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify({ name: filename, properties: { prefix: prefix || '', uploadedAt: new Date().toISOString() } }) +
          `\r\n--${boundary}\r\n` +
          `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
        );
        const fallbackBody = Buffer.concat([fallbackHeader, content, footerPart]);
        const fallbackRes = await this.httpRequest('POST', url, fallbackBody, {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        });
        if (fallbackRes.statusCode === 200 || fallbackRes.statusCode === 201) {
          const data = JSON.parse(fallbackRes.body.toString('utf8'));
          this.fileIdCache.set(filename, data.id);
          return data.id;
        }
      }
      throw new Error(`Google Drive upload failed (${res.statusCode}): ${res.body.toString('utf8')}`);
    }

    const data = JSON.parse(res.body.toString('utf8'));
    this.fileIdCache.set(filename, data.id);
    return data.id;
  }

  async downloadFile(filename: string, prefix?: string): Promise<Buffer> {
    const fileId = await this.findFileId(filename);
    if (!fileId) {
      throw new Error(`File ${filename} not found in Google Drive folder.`);
    }

    const token = await this.getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;

    const res = await this.httpRequest('GET', url, Buffer.alloc(0), {
      Authorization: `Bearer ${token}`,
    });

    if (res.statusCode !== 200) {
      throw new Error(`Failed to download file ${filename} from Google Drive: ${res.body.toString('utf8')}`);
    }

    return res.body;
  }

  async deleteFile(filename: string, prefix?: string): Promise<boolean> {
    try {
      const fileId = await this.findFileId(filename);
      if (!fileId) return false;

      const token = await this.getAccessToken();
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`;

      const res = await this.httpRequest('DELETE', url, Buffer.alloc(0), {
        Authorization: `Bearer ${token}`,
      });

      this.fileIdCache.delete(filename);
      return res.statusCode === 204 || res.statusCode === 200;
    } catch (err) {
      console.warn(`Failed to delete file ${filename} on Google Drive:`, err);
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    const token = await this.getAccessToken();
    let query = `'${this.folderId}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,mimeType,createdTime)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const res = await this.httpRequest('GET', url, Buffer.alloc(0), {
      Authorization: `Bearer ${token}`,
    });

    if (res.statusCode !== 200) {
      throw new Error(`Failed to list files from Google Drive: ${res.body.toString('utf8')}`);
    }

    const data = JSON.parse(res.body.toString('utf8'));
    const results: FileMetadata[] = [];

    for (const f of data.files || []) {
      results.push({
        filename: f.name,
        size: parseInt(f.size || '0', 10),
        lastModified: new Date(f.createdTime || Date.now()),
        contentType: f.mimeType,
      });
    }

    return results;
  }

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const token = await this.getAccessToken();

      // If a specific destination folder is configured, verify folder existence & write permissions with a live test
      if (this.folderId && this.folderId !== 'root') {
        const folderUrl = `https://www.googleapis.com/drive/v3/files/${this.folderId}?fields=id,name,mimeType,capabilities&supportsAllDrives=true`;
        const folderRes = await this.httpRequest('GET', folderUrl, Buffer.alloc(0), {
          Authorization: `Bearer ${token}`,
        });

        if (folderRes.statusCode === 200) {
          const folderData = JSON.parse(folderRes.body.toString('utf8'));
          
          // Test live file write, read, and delete in the destination folder
          try {
            const testFilename = `.quicknotes_test_${Date.now()}.txt`;
            await this.uploadFile(testFilename, Buffer.from('QuickNotes storage connection test'), 'text/plain');
            await this.downloadFile(testFilename);
            await this.deleteFile(testFilename);

            const accountInfo = this.connectedEmail ? ` (Account: ${this.connectedEmail})` : (this.clientEmail ? ` (Service Account: ${this.clientEmail})` : '');
            return {
              success: true,
              message: `Connection OK — wrote, read and deleted a test file in folder "${folderData.name}"${accountInfo}`,
              latencyMs: Date.now() - start,
              details: { folderId: this.folderId, folderName: folderData.name },
            };
          } catch (writeErr: any) {
            return {
              success: false,
              message: `Folder "${folderData.name}" found, but failed write/read test: ${writeErr.message}. Ensure permissions are set to Editor.`,
              latencyMs: Date.now() - start,
            };
          }
        } else if (folderRes.statusCode === 404 || folderRes.statusCode === 403) {
          const emailTip = this.clientEmail ? `Please share the Google Drive folder with "${this.clientEmail}" as Editor.` : 'Please verify the folder ID and permissions.';
          return {
            success: false,
            message: `Google Drive Folder ID "${this.folderId}" is not accessible (${folderRes.statusCode}). ${emailTip}`,
            latencyMs: Date.now() - start,
          };
        }
      }

      // If in service account mode and folderId is root or missing, warn the user
      if (this.authMode === 'service_account' && (!this.folderId || this.folderId === 'root')) {
        return {
          success: false,
          message: `Destination Folder ID is set to 'root'. Service Accounts have 0 GB quota on personal drives. Please use OAuth 2.0 (with Refresh Token) or a Workspace Shared Drive.`,
          latencyMs: Date.now() - start,
        };
      }

      // Live write, read, delete test in root folder (OAuth mode)
      try {
        const testFilename = `.quicknotes_test_${Date.now()}.txt`;
        await this.uploadFile(testFilename, Buffer.from('QuickNotes storage connection test'), 'text/plain');
        await this.downloadFile(testFilename);
        await this.deleteFile(testFilename);

        const accountInfo = this.connectedEmail ? ` (Account: ${this.connectedEmail})` : '';
        return {
          success: true,
          message: `Connection OK — wrote, read and deleted a test file in My Drive root${accountInfo}`,
          latencyMs: Date.now() - start,
        };
      } catch (writeErr: any) {
        return {
          success: false,
          message: `Connection test failed: ${writeErr.message}`,
          latencyMs: Date.now() - start,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Google Drive connection failed: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      return {
        providerType: 'gdrive',
        displayName: this.displayName,
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        isAvailable: true,
      };
    } catch (err: any) {
      return {
        providerType: 'gdrive',
        displayName: this.displayName,
        totalFiles: 0,
        totalSizeBytes: 0,
        isAvailable: false,
        statusMessage: err.message,
      };
    }
  }
}
