export const APP_VERSION = 'v1.1.0';

export type NoteColor =
  | 'default'
  | 'coral'
  | 'peach'
  | 'sand'
  | 'mint'
  | 'sage'
  | 'fog'
  | 'storm'
  | 'blossom'
  | 'clay'
  | 'chalk'
  | 'gray';

export type UserRole = 'owner' | 'api';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  username?: string;
  role?: string;
  display_name?: string;
  apiKey?: string; // only present on creation
}

export interface ChecklistItem {
  id?: string;
  note_id?: string;
  text: string;
  is_completed: boolean;
  position?: number;
  created_at?: string;
}

export interface Attachment {
  id: string;
  note_id?: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  thumbnail_filename?: string | null;
  storage_provider?: string;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  parent_id?: string | null;
  parent_name?: string | null;
  color: string;
  sort_order?: number;
  note_count?: number;
  created_at?: string;
  children?: Tag[];
}

export interface Note {
  id: string;
  user_id?: string | null;
  title: string;
  content: string;
  color: NoteColor;
  is_starred: boolean;
  is_archived: boolean;
  is_trashed: boolean;
  created_at: string;
  updated_at: string;
  checklist_items: ChecklistItem[];
  attachments: Attachment[];
  tags: Tag[];
}

export type ViewMode = 'notes' | 'starred' | 'archive' | 'trash' | 'settings';
export type SettingsTab = 'appearance' | 'labels' | 'users' | 'api' | 'storage' | 'backups';

export interface NoteCounts {
  notes: number;
  starred: number;
  archive: number;
  trash: number;
}

export type AppTheme = 'default' | 'dark' | 'coffee' | 'kraft';

export type FontFamilyOption =
  | 'ibm'
  | 'jakarta'
  | 'inter'
  | 'noto'
  | 'merriweather'
  | 'playfair'
  | 'lora'
  | 'system';

export type FontSizeOption = 'compact' | 'default' | 'medium' | 'large' | 'xlarge';

export interface FilterOptions {
  view: ViewMode;
  tag?: string;
  tag_ids?: string[];
  tag_match?: 'and' | 'or';
  color?: NoteColor | 'all';
  q?: string;
  date_from?: string;
  date_to?: string;
  date_field?: 'created_at' | 'updated_at';
  has_images?: boolean;
  has_files?: boolean;
  has_checklist?: boolean;
}

export interface StorageConfig {
  id: string;
  provider_type: 'local' | 's3' | 'gdrive';
  is_active: boolean;
  config: Record<string, any>;
}

export interface BackupRecord {
  id: string;
  filename: string;
  storage_provider: string;
  backup_type?: 'database_only' | 'full';
  includes_attachments?: boolean;
  file_size: number;
  checksum_sha256: string;
  is_verified: boolean;
  verification_details?: any;
  created_at: string;
}

export interface BackupScheduleConfig {
  id: string;
  enabled: boolean;
  interval_days: number;
  backup_type: 'database_only' | 'full';
  storage_provider: 'local' | 's3' | 'gdrive';
  retention_count: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

