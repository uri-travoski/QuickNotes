import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { StorageProvider, StorageStats, FileMetadata, TestResult } from './base.js';

export interface S3Config {
  endpoint_url?: string;
  region?: string;
  bucket_name: string;
  access_key_id: string;
  secret_access_key: string;
  custom_domain?: string;
  prefix?: string;
  backup_prefix?: string;
}

export class S3StorageProvider implements StorageProvider {
  private endpointUrl: string;
  private region: string;
  private bucketName: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private customDomain: string;
  private prefix: string;
  private backupPrefix: string;

  constructor(config: S3Config) {
    this.endpointUrl = (config.endpoint_url || '').replace(/\/+$/, '');
    this.region = config.region || 'us-east-1';
    this.bucketName = config.bucket_name || '';
    this.accessKeyId = config.access_key_id || '';
    this.secretAccessKey = config.secret_access_key || '';
    this.customDomain = (config.custom_domain || '').replace(/\/+$/, '');
    this.prefix = (config.prefix || 'attachments').replace(/^\/+|\/+$/g, '');
    this.backupPrefix = (config.backup_prefix || 'backups').replace(/^\/+|\/+$/g, '');

    if (!this.endpointUrl) {
      this.endpointUrl = `https://s3.${this.region}.amazonaws.com`;
    }
  }

  get providerType(): string {
    return 's3';
  }

  get displayName(): string {
    if (this.endpointUrl.includes('r2.cloudflarestorage.com')) return 'Cloudflare R2 Storage';
    if (this.endpointUrl.includes('backblazeb2.com')) return 'Backblaze B2 Storage';
    if (this.endpointUrl.includes('localhost') || this.endpointUrl.includes('minio')) return 'MinIO Object Storage';
    return 'S3-Compatible Object Storage';
  }

  private hmacSha256(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = this.hmacSha256(`AWS4${key}`, dateStamp);
    const kRegion = this.hmacSha256(kDate, regionName);
    const kService = this.hmacSha256(kRegion, serviceName);
    const kSigning = this.hmacSha256(kService, 'aws4_request');
    return kSigning;
  }

  private async request(
    method: string,
    keyPath: string,
    body: Buffer = Buffer.alloc(0),
    headers: Record<string, string> = {},
    queryParams: Record<string, string> = {}
  ): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    if (!this.bucketName || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error('S3 bucket name, access key ID, and secret access key are required.');
    }

    const parsedEndpoint = new URL(this.endpointUrl);
    const host = parsedEndpoint.host;
    const isHttps = parsedEndpoint.protocol === 'https:';

    const cleanKey = keyPath.replace(/^\/+/, '');
    const canonicalUri = cleanKey
      ? `${parsedEndpoint.pathname.replace(/\/+$/, '')}/${this.bucketName}/${cleanKey}`
      : `${parsedEndpoint.pathname.replace(/\/+$/, '')}/${this.bucketName}`;

    const normalizedUri = canonicalUri.startsWith('/') ? canonicalUri : `/${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const reqHeaders: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...headers,
    };

    if (body.length > 0 && !reqHeaders['content-length']) {
      reqHeaders['content-length'] = body.length.toString();
    }

    const sortedParams = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedParams
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const sortedHeaderKeys = Object.keys(reqHeaders).map((k) => k.toLowerCase()).sort();
    const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${reqHeaders[k].trim()}\n`).join('');
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = [
      method,
      normalizedUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${this.region}/s3/aws4_request`,
      crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${dateStamp}/${this.region}/s3/aws4_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    reqHeaders['Authorization'] = authorizationHeader;

    const requestUrl = new URL(this.endpointUrl);
    requestUrl.pathname = normalizedUri;
    for (const [k, v] of Object.entries(queryParams)) {
      requestUrl.searchParams.set(k, v);
    }

    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(
        requestUrl,
        {
          method,
          headers: reqHeaders,
          timeout: 15000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const resBody = Buffer.concat(chunks);
            resolve({
              statusCode: res.statusCode || 500,
              headers: res.headers,
              body: resBody,
            });
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('S3 request timed out after 15s'));
      });

      if (body.length > 0) {
        req.write(body);
      }
      req.end();
    });
  }

  private buildKey(filename: string, prefix?: string): string {
    const p = prefix !== undefined ? prefix : this.prefix;
    return p ? `${p.replace(/\/+$/, '')}/${filename}` : filename;
  }

  async uploadFile(filename: string, content: Buffer, mimeType: string, prefix?: string): Promise<string> {
    const key = this.buildKey(filename, prefix);
    const res = await this.request('PUT', key, content, {
      'content-type': mimeType || 'application/octet-stream',
    });

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 upload failed (${res.statusCode}): ${res.body.toString('utf8')}`);
    }

    return key;
  }

  async downloadFile(filename: string, prefix?: string): Promise<Buffer> {
    const key = this.buildKey(filename, prefix);
    const res = await this.request('GET', key);

    if (res.statusCode === 404) {
      throw new Error(`File not found on S3: ${key}`);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 download failed (${res.statusCode}): ${res.body.toString('utf8')}`);
    }

    return res.body;
  }

  async deleteFile(filename: string, prefix?: string): Promise<boolean> {
    const key = this.buildKey(filename, prefix);
    const res = await this.request('DELETE', key);
    return res.statusCode >= 200 && res.statusCode < 300;
  }

  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    const p = prefix !== undefined ? prefix : this.prefix;
    const queryParams: Record<string, string> = { 'list-type': '2' };
    if (p) queryParams['prefix'] = p;

    const res = await this.request('GET', '', Buffer.alloc(0), {}, queryParams);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(`S3 list failed (${res.statusCode}): ${res.body.toString('utf8')}`);
    }

    const xml = res.body.toString('utf8');
    const results: FileMetadata[] = [];

    // Simple regex parser for S3 ListBucketResult
    const keyMatches = xml.matchAll(/<Key>(.*?)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<LastModified>(.*?)<\/LastModified>/g);
    for (const match of keyMatches) {
      const key = match[1];
      const size = parseInt(match[2], 10);
      const lastModified = new Date(match[3]);
      const filename = key.split('/').pop() || key;

      results.push({
        filename,
        size,
        lastModified,
        url: this.customDomain ? `${this.customDomain}/${key}` : undefined,
      });
    }

    return results;
  }

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      // Test listing objects
      const res = await this.request('GET', '', Buffer.alloc(0), {}, { 'max-keys': '1' });
      if (res.statusCode === 200) {
        return {
          success: true,
          message: `Successfully connected to S3 bucket "${this.bucketName}"`,
          latencyMs: Date.now() - start,
          details: {
            endpoint: this.endpointUrl,
            bucket: this.bucketName,
            region: this.region,
          },
        };
      } else {
        return {
          success: false,
          message: `S3 connection returned status ${res.statusCode}: ${res.body.toString('utf8').substring(0, 200)}`,
          latencyMs: Date.now() - start,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `S3 connection failed: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      return {
        providerType: 's3',
        displayName: this.displayName,
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        isAvailable: true,
      };
    } catch (err: any) {
      return {
        providerType: 's3',
        displayName: this.displayName,
        totalFiles: 0,
        totalSizeBytes: 0,
        isAvailable: false,
        statusMessage: err.message,
      };
    }
  }
}
