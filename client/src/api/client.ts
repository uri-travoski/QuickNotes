import {
  Note,
  Tag,
  Attachment,
  FilterOptions,
  NoteColor,
  User,
  ApiKey,
  StorageConfig,
  BackupRecord,
  BackupScheduleConfig,
  NoteCounts,
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('quicknotes_auth_token') || localStorage.getItem('saved_auth_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('quicknotes_auth_token', token);
    localStorage.removeItem('saved_auth_token');
  } else {
    localStorage.removeItem('quicknotes_auth_token');
    localStorage.removeItem('saved_auth_token');
  }
}

// ----------------------------------------------------
// Auth Endpoints
// ----------------------------------------------------
export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }
  const data = await res.json();
  setStoredToken(data.token);
  return data;
}

export async function fetchCurrentUser(): Promise<{ authenticated: boolean; user: User | null }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) return { authenticated: false, user: null };
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  setStoredToken(null);
}

// ----------------------------------------------------
// User Management Endpoints (Owner only)
// ----------------------------------------------------
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(data: { username: string; password: string; role: 'owner' | 'api'; display_name?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return res.json();
}

export async function updateUser(id: string, data: { role?: 'owner' | 'api'; display_name?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function changeUserPassword(id: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/users/${id}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Failed to change password');
  return res.json();
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete user');
  }
  return res.json();
}

// ----------------------------------------------------
// API Key Endpoints (Owner only)
// ----------------------------------------------------
export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await fetch(`${API_BASE}/api-keys`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch API keys');
  return res.json();
}

export async function createApiKey(name: string, user_id?: string, expires_in_days?: number): Promise<ApiKey & { apiKey: string }> {
  const res = await fetch(`${API_BASE}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ name, user_id, expires_in_days }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create API key');
  }
  return res.json();
}

export async function revokeApiKey(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api-keys/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to revoke API key');
  return res.json();
}

// ----------------------------------------------------
// API Docs Endpoints
// ----------------------------------------------------
export async function fetchOpenApiSpec(): Promise<any> {
  const res = await fetch(`${API_BASE}/docs/spec`);
  return res.json();
}

export async function fetchAiToolsSpec(): Promise<any> {
  const res = await fetch(`${API_BASE}/docs/ai-tools`);
  return res.json();
}

// ----------------------------------------------------
// Notes Endpoints
// ----------------------------------------------------
export async function fetchNotes(filters: Partial<FilterOptions> = {}): Promise<Note[]> {
  const params = new URLSearchParams();
  if (filters.view && filters.view !== 'settings') params.append('view', filters.view);
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.tag_ids && filters.tag_ids.length > 0) {
    params.append('tag_ids', filters.tag_ids.join(','));
  }
  if (filters.tag_match) params.append('tag_match', filters.tag_match);
  if (filters.color && filters.color !== 'all') params.append('color', filters.color);
  if (filters.q) params.append('q', filters.q);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.date_field) params.append('date_field', filters.date_field);
  if (filters.has_images) params.append('has_images', 'true');
  if (filters.has_files) params.append('has_files', 'true');
  if (filters.has_checklist) params.append('has_checklist', 'true');

  const res = await fetch(`${API_BASE}/notes?${params.toString()}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function fetchNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

export async function createNote(data: {
  title?: string;
  content?: string;
  color?: NoteColor;
  is_starred?: boolean;
  is_archived?: boolean;
  checklist_items?: Array<{ text: string; is_completed: boolean; position?: number }>;
  tag_ids?: string[];
  attachment_ids?: string[];
}): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(
  id: string,
  data: Partial<{
    title: string;
    content: string;
    color: NoteColor;
    is_starred: boolean;
    is_archived: boolean;
    is_trashed: boolean;
    checklist_items: Array<{ text: string; is_completed: boolean; position?: number }>;
    tag_ids: string[];
  }>
): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update note');
  }
  return res.json();
}

export async function toggleStar(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/star`, {
    method: 'PATCH',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to toggle star');
  return res.json();
}

export async function toggleArchive(id: string, is_archived?: boolean): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ is_archived }),
  });
  if (!res.ok) throw new Error('Failed to toggle archive');
  return res.json();
}

export async function toggleTrash(id: string, is_trashed?: boolean): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/trash`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ is_trashed }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to toggle trash');
  }
  return res.json();
}

export async function changeColor(id: string, color: NoteColor): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/color`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ color }),
  });
  if (!res.ok) throw new Error('Failed to change color');
  return res.json();
}

export async function toggleChecklistItem(
  noteId: string,
  itemId: string,
  is_completed: boolean,
  text?: string
): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${noteId}/checklist-item/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ is_completed, text }),
  });
  if (!res.ok) throw new Error('Failed to toggle checklist item');
  return res.json();
}

export async function duplicateNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/duplicate`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to duplicate note');
  return res.json();
}

export async function deleteNote(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete note');
  }
  return res.json();
}

export async function emptyTrash(): Promise<{ message: string; deletedCount: number }> {
  const res = await fetch(`${API_BASE}/notes/empty-trash`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to empty trash');
  }
  return res.json();
}

export async function fetchNoteCounts(): Promise<NoteCounts> {
  const res = await fetch(`${API_BASE}/notes/counts`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch note counts');
  return res.json();
}

// ----------------------------------------------------
// Attachments Endpoints
// ----------------------------------------------------
export async function uploadAttachments(files: File[], noteId?: string): Promise<Attachment[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (noteId) {
    formData.append('note_id', noteId);
  }

  const endpoint = noteId ? `${API_BASE}/attachments/note/${noteId}` : `${API_BASE}/attachments/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload attachments');
  return res.json();
}

export async function deleteAttachment(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/attachments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete attachment');
  return res.json();
}

export function getAttachmentDownloadUrl(id: string): string {
  return `${API_BASE}/attachments/${id}/download`;
}

export function getFileUrl(filename: string): string {
  if (!filename) return '';
  if (filename.startsWith('thumb-')) {
    return `/uploads/thumbnails/${filename}`;
  }
  return `/uploads/${filename}`;
}

export function getThumbnailUrl(thumbnailFilename: string | null | undefined, originalFilename: string): string {
  if (thumbnailFilename) {
    return `/uploads/thumbnails/${thumbnailFilename}`;
  }
  return `/uploads/${originalFilename}`;
}

// ----------------------------------------------------
// 2-Step Nested Labels Endpoints
// ----------------------------------------------------
export async function fetchTags(): Promise<{ flat: Tag[]; tree: Tag[] }> {
  const res = await fetch(`${API_BASE}/tags`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch labels');
  return res.json();
}

export async function createTag(name: string, parent_id: string | null = null, color: string = 'default'): Promise<Tag> {
  const res = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ name, parent_id, color }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create label');
  }
  return res.json();
}

export async function updateTag(
  id: string,
  name: string,
  parent_id?: string | null,
  color?: string,
  sort_order?: number
): Promise<Tag> {
  const res = await fetch(`${API_BASE}/tags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ name, parent_id, color, sort_order }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update label');
  }
  return res.json();
}

export async function deleteTag(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/tags/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete label');
  return res.json();
}

// ----------------------------------------------------
// Storage Settings Endpoints (Owner only)
// ----------------------------------------------------
export async function fetchStorageConfigs(): Promise<{ active_provider: string; providers: StorageConfig[] }> {
  const res = await fetch(`${API_BASE}/storage/configs`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch storage configs');
  return res.json();
}

export async function updateStorageConfig(provider: string, config: any, set_active: boolean = false): Promise<any> {
  const res = await fetch(`${API_BASE}/storage/configs/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ config, set_active }),
  });
  if (!res.ok) throw new Error('Failed to update storage config');
  return res.json();
}

export async function testStorageConnection(provider_type: string, config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/storage/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ provider_type, config }),
  });
  return res.json();
}

export async function getGoogleDriveAuthUrl(clientId?: string, clientSecret?: string, redirectUri?: string): Promise<{ url: string; redirect_uri: string; client_id: string }> {
  const params = new URLSearchParams();
  if (clientId) params.append('client_id', clientId);
  if (clientSecret) params.append('client_secret', clientSecret);
  if (redirectUri) params.append('redirect_uri', redirectUri);

  const res = await fetch(`${API_BASE}/storage/gdrive/oauth/url?${params.toString()}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate Google authorization URL');
  }
  return res.json();
}

export async function disconnectGoogleDrive(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/storage/gdrive/oauth/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to disconnect Google Drive');
  }
  return res.json();
}

export async function setActiveStorageProvider(provider_type: string): Promise<any> {
  const res = await fetch(`${API_BASE}/storage/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ provider_type }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to activate storage provider');
  }
  return res.json();
}

export async function syncStorage(): Promise<{ message: string; syncedCount: number; failedCount: number; errors?: string[] }> {
  const res = await fetch(`${API_BASE}/storage/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to sync attachments to cloud storage');
  }
  return res.json();
}

// ----------------------------------------------------
// Backup & Restore Endpoints (Owner only)
// ----------------------------------------------------
export async function fetchBackups(): Promise<BackupRecord[]> {
  const res = await fetch(`${API_BASE}/backups`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch backups');
  return res.json();
}

export async function fetchBackupSchedule(): Promise<BackupScheduleConfig> {
  const res = await fetch(`${API_BASE}/backups/schedule`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch backup schedule');
  return res.json();
}

export async function saveBackupSchedule(data: {
  enabled?: boolean;
  interval_days?: number;
  backup_type?: 'database_only' | 'full';
  storage_provider?: 'local' | 's3' | 'gdrive';
  retention_count?: number;
}): Promise<{ message: string; schedule: BackupScheduleConfig }> {
  const res = await fetch(`${API_BASE}/backups/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update backup schedule');
  }
  return res.json();
}

export async function runBackupScheduleNow(): Promise<any> {
  const res = await fetch(`${API_BASE}/backups/schedule/run-now`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to trigger scheduled backup');
  }
  return res.json();
}

export async function createBackup(
  storage_provider: string = 'local',
  backup_type: 'database_only' | 'full' = 'database_only'
): Promise<any> {
  const res = await fetch(`${API_BASE}/backups/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ storage_provider, backup_type }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create backup');
  }
  return res.json();
}

export async function verifyBackup(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/backups/${id}/verify`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to verify backup');
  return res.json();
}

export async function restoreBackup(id: string, restoreAttachments: boolean = true): Promise<any> {
  const res = await fetch(`${API_BASE}/backups/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ restoreAttachments }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to restore backup');
  }
  return res.json();
}

export async function uploadAndRestoreBackup(file: File, restoreAttachments: boolean = true): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('restoreAttachments', String(restoreAttachments));

  const res = await fetch(`${API_BASE}/backups/upload-restore`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to restore uploaded backup');
  }
  return res.json();
}

export function getBackupDownloadUrl(id: string): string {
  return `${API_BASE}/backups/${id}/download`;
}

export async function downloadBackupFile(id: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/backups/${id}/download`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download backup file');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function deleteBackup(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/backups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete backup');
  return res.json();
}

