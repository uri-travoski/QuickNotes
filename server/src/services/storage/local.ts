import fs from 'fs';
import path from 'path';
import { StorageProvider, StorageStats, FileMetadata, TestResult } from './base.js';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(config?: { baseDir?: string }) {
    this.baseDir = config?.baseDir || process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  get providerType(): string {
    return 'local';
  }

  get displayName(): string {
    return 'Local Disk Storage';
  }

  private resolvePath(filename: string, prefix: string = ''): string {
    const targetDir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return path.join(targetDir, filename);
  }

  async uploadFile(filename: string, content: Buffer, _mimeType: string, prefix: string = ''): Promise<string> {
    const filePath = this.resolvePath(filename, prefix);
    await fs.promises.writeFile(filePath, content);
    return prefix ? `${prefix}/${filename}` : filename;
  }

  async downloadFile(filename: string, prefix: string = ''): Promise<Buffer> {
    const filePath = this.resolvePath(filename, prefix);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(filename: string, prefix: string = ''): Promise<boolean> {
    const filePath = this.resolvePath(filename, prefix);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  async listFiles(prefix: string = ''): Promise<FileMetadata[]> {
    const targetDir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
    if (!fs.existsSync(targetDir)) return [];

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    const results: FileMetadata[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(targetDir, entry.name);
        const stat = await fs.promises.stat(fullPath);
        results.push({
          filename: entry.name,
          size: stat.size,
          lastModified: stat.mtime,
          url: `/uploads/${prefix ? `${prefix}/` : ''}${entry.name}`,
        });
      }
    }
    return results;
  }

  async testConnection(): Promise<TestResult> {
    const start = Date.now();
    try {
      const testFile = `.test_connection_${Date.now()}.tmp`;
      const testPath = path.join(this.baseDir, testFile);
      await fs.promises.writeFile(testPath, 'quicknotes_connection_test');
      await fs.promises.readFile(testPath);
      await fs.promises.unlink(testPath);

      return {
        success: true,
        message: 'Local disk storage is read/write accessible',
        latencyMs: Date.now() - start,
        details: { baseDir: this.baseDir },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Local disk error: ${err.message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      return {
        providerType: 'local',
        displayName: this.displayName,
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        isAvailable: true,
      };
    } catch (err: any) {
      return {
        providerType: 'local',
        displayName: this.displayName,
        totalFiles: 0,
        totalSizeBytes: 0,
        isAvailable: false,
        statusMessage: err.message,
      };
    }
  }
}
