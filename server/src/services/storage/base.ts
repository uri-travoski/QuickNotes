export interface FileMetadata {
  filename: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  url?: string;
}

export interface StorageStats {
  providerType: string;
  displayName: string;
  totalFiles: number;
  totalSizeBytes: number;
  isAvailable: boolean;
  statusMessage?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  latencyMs?: number;
}

export interface StorageProvider {
  readonly providerType: string;
  readonly displayName: string;

  uploadFile(filename: string, content: Buffer, mimeType: string, prefix?: string): Promise<string>;
  downloadFile(filename: string, prefix?: string): Promise<Buffer>;
  deleteFile(filename: string, prefix?: string): Promise<boolean>;
  listFiles(prefix?: string): Promise<FileMetadata[]>;
  testConnection(): Promise<TestResult>;
  getStats(): Promise<StorageStats>;
}
