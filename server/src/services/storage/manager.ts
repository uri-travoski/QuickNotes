import { StorageProvider, TestResult, StorageStats } from './base.js';
import { LocalStorageProvider } from './local.js';
import { S3StorageProvider, S3Config } from './s3.js';
import { GoogleDriveStorageProvider, GDriveConfig } from './gdrive.js';
import { query } from '../../db/index.js';

export class StorageManager {
  private localProvider: LocalStorageProvider;
  private s3Provider: S3StorageProvider | null = null;
  private gdriveProvider: GoogleDriveStorageProvider | null = null;
  private activeType: 'local' | 's3' | 'gdrive' = 'local';
  private initialized: boolean = false;

  constructor() {
    this.localProvider = new LocalStorageProvider();
  }

  async initialize() {
    if (this.initialized) return;
    try {
      const result = await query('SELECT * FROM storage_configs');
      for (const row of result.rows) {
        if (row.provider_type === 's3' && row.config_json) {
          this.s3Provider = new S3StorageProvider(row.config_json as S3Config);
        } else if (row.provider_type === 'gdrive' && row.config_json) {
          this.gdriveProvider = new GoogleDriveStorageProvider(row.config_json as GDriveConfig);
        }

        if (row.is_active) {
          this.activeType = row.provider_type as 'local' | 's3' | 'gdrive';
        }
      }

      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize storage configs from DB, using local disk default:', err);
    }
  }

  getProvider(type: 'local' | 's3' | 'gdrive'): StorageProvider {
    if (type === 's3') {
      if (!this.s3Provider) throw new Error('S3 storage provider is not configured.');
      return this.s3Provider;
    }
    if (type === 'gdrive') {
      if (!this.gdriveProvider) throw new Error('Google Drive storage provider is not configured.');
      return this.gdriveProvider;
    }
    return this.localProvider;
  }

  getActiveProvider(): StorageProvider {
    if (this.activeType === 's3' && this.s3Provider) return this.s3Provider;
    if (this.activeType === 'gdrive' && this.gdriveProvider) return this.gdriveProvider;
    return this.localProvider;
  }

  getActiveType(): 'local' | 's3' | 'gdrive' {
    return this.activeType;
  }

  async upload(filename: string, content: Buffer, mimeType: string, prefix?: string): Promise<{ storageProvider: string; storagePath: string }> {
    await this.initialize();
    const provider = this.getActiveProvider();
    console.log(`[StorageManager] Uploading "${filename}" (${mimeType}, ${content.length} bytes) via ${provider.providerType} (active: ${this.activeType})`);
    const storagePath = await provider.uploadFile(filename, content, mimeType, prefix);
    console.log(`[StorageManager] Successfully uploaded "${filename}" to ${provider.providerType} (storagePath: ${storagePath})`);
    return {
      storageProvider: provider.providerType,
      storagePath,
    };
  }

  async download(filename: string, providerType: string = 'local', prefix?: string): Promise<Buffer> {
    await this.initialize();
    const provider = this.getProvider(providerType as any);
    return provider.downloadFile(filename, prefix);
  }

  async delete(filename: string, providerType: string = 'local', prefix?: string): Promise<boolean> {
    await this.initialize();
    try {
      const provider = this.getProvider(providerType as any);
      return await provider.deleteFile(filename, prefix);
    } catch (err) {
      console.warn(`Failed to delete file ${filename} on ${providerType}:`, err);
      return false;
    }
  }

  async testProvider(type: 'local' | 's3' | 'gdrive', config?: any): Promise<TestResult> {
    if (type === 'local') {
      return this.localProvider.testConnection();
    }
    if (type === 's3') {
      let finalConfig = config;
      if (config && (!config.secret_access_key || config.secret_access_key.startsWith('•••') || config.secret_access_key.startsWith('••••'))) {
        const existing = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['s3']);
        const prev = existing.rows[0]?.config_json;
        if (prev?.secret_access_key) {
          finalConfig = { ...config, secret_access_key: prev.secret_access_key };
        }
      }
      const testProvider = finalConfig ? new S3StorageProvider(finalConfig) : this.s3Provider;
      if (!testProvider) throw new Error('S3 configuration is missing');
      return testProvider.testConnection();
    }
    if (type === 'gdrive') {
      let finalConfig = config;
      if (config) {
        const existing = await query('SELECT config_json FROM storage_configs WHERE id = $1', ['gdrive']);
        const prev = existing.rows[0]?.config_json || {};
        if ((!config.service_account_json || config.service_account_json.trim() === '') && prev.service_account_json) {
          finalConfig = { ...finalConfig, service_account_json: prev.service_account_json };
        }
        if ((!config.private_key || (typeof config.private_key === 'string' && config.private_key.includes('••'))) && prev.private_key) {
          finalConfig = { ...finalConfig, private_key: prev.private_key };
        }
        if (!config.client_email && prev.client_email) {
          finalConfig = { ...finalConfig, client_email: prev.client_email };
        }
        if ((!config.client_secret || (typeof config.client_secret === 'string' && config.client_secret.includes('••'))) && prev.client_secret) {
          finalConfig = { ...finalConfig, client_secret: prev.client_secret };
        }
        if ((!config.refresh_token || (typeof config.refresh_token === 'string' && config.refresh_token.includes('••'))) && prev.refresh_token) {
          finalConfig = { ...finalConfig, refresh_token: prev.refresh_token };
        }
        if (!config.client_id && prev.client_id) {
          finalConfig = { ...finalConfig, client_id: prev.client_id };
        }
        if (!config.connected_email && prev.connected_email) {
          finalConfig = { ...finalConfig, connected_email: prev.connected_email };
        }
      }
      const testProvider = finalConfig ? new GoogleDriveStorageProvider(finalConfig) : this.gdriveProvider;
      if (!testProvider) throw new Error('Google Drive configuration is missing');
      return testProvider.testConnection();
    }
    throw new Error(`Unknown provider type: ${type}`);
  }

  async saveConfig(type: 'local' | 's3' | 'gdrive', config: any, setActive: boolean = false): Promise<void> {
    // Merge with previous configuration to prevent overwriting existing secrets if masked
    const existing = await query('SELECT config_json FROM storage_configs WHERE id = $1', [type]);
    const prev = existing.rows[0]?.config_json || {};

    let mergedConfig = { ...config };
    if (type === 's3') {
      if ((!mergedConfig.secret_access_key || mergedConfig.secret_access_key.startsWith('•••') || mergedConfig.secret_access_key.startsWith('••••')) && prev.secret_access_key) {
        mergedConfig.secret_access_key = prev.secret_access_key;
      }
      this.s3Provider = new S3StorageProvider(mergedConfig);
    } else if (type === 'gdrive') {
      if ((!mergedConfig.service_account_json || mergedConfig.service_account_json.trim() === '') && prev.service_account_json) {
        mergedConfig.service_account_json = prev.service_account_json;
      }
      if ((!mergedConfig.private_key || (typeof mergedConfig.private_key === 'string' && mergedConfig.private_key.includes('••'))) && prev.private_key) {
        mergedConfig.private_key = prev.private_key;
      }
      if (!mergedConfig.client_email && prev.client_email) {
        mergedConfig.client_email = prev.client_email;
      }
      if ((!mergedConfig.client_secret || (typeof mergedConfig.client_secret === 'string' && mergedConfig.client_secret.includes('••'))) && prev.client_secret) {
        mergedConfig.client_secret = prev.client_secret;
      }
      if ((mergedConfig.refresh_token === undefined || (typeof mergedConfig.refresh_token === 'string' && mergedConfig.refresh_token.includes('••'))) && prev.refresh_token) {
        mergedConfig.refresh_token = prev.refresh_token;
      } else if (mergedConfig.refresh_token === null || mergedConfig.refresh_token === '') {
        delete mergedConfig.refresh_token;
      }
      if (mergedConfig.client_id === undefined && prev.client_id) {
        mergedConfig.client_id = prev.client_id;
      }
      if (mergedConfig.connected_email === undefined && prev.connected_email) {
        mergedConfig.connected_email = prev.connected_email;
      } else if (mergedConfig.connected_email === null || mergedConfig.connected_email === '') {
        delete mergedConfig.connected_email;
      }
      this.gdriveProvider = new GoogleDriveStorageProvider(mergedConfig);
    }

    if (setActive) {
      this.activeType = type;
      await query('UPDATE storage_configs SET is_active = FALSE');
    }

    await query(
      `INSERT INTO storage_configs (id, provider_type, is_active, config_json, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         is_active = $3,
         config_json = $4,
         updated_at = NOW()`,
      [type, type, setActive, JSON.stringify(mergedConfig)]
    );
  }

  async setActive(type: 'local' | 's3' | 'gdrive'): Promise<void> {
    // Validate provider exists
    if (type === 's3' && !this.s3Provider) {
      throw new Error('Cannot activate S3 storage without configuring it first.');
    }
    if (type === 'gdrive' && !this.gdriveProvider) {
      throw new Error('Cannot activate Google Drive storage without configuring it first.');
    }

    this.activeType = type;
    await query('UPDATE storage_configs SET is_active = FALSE');
    await query(
      `INSERT INTO storage_configs (id, provider_type, is_active, config_json, updated_at)
       VALUES ($1, $2, TRUE, '{}'::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET is_active = TRUE, updated_at = NOW()`,
      [type, type]
    );
  }

  async getAllConfigs(): Promise<Array<{ id: string; provider_type: string; is_active: boolean; config: any }>> {
    await this.initialize();
    const result = await query('SELECT * FROM storage_configs');
    const existingMap = new Map(result.rows.map((r) => [r.id, r]));

    const providers: Array<'local' | 's3' | 'gdrive'> = ['local', 's3', 'gdrive'];
    return providers.map((p) => {
      const row = existingMap.get(p);
      return {
        id: p,
        provider_type: p,
        is_active: this.activeType === p,
        config: row ? row.config_json : {},
      };
    });
  }
}

export const storageManager = new StorageManager();
