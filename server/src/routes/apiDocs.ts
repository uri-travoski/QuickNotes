import { Router } from 'express';

const router = Router();

// OpenAPI 3.1 Specification JSON
const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'QuickNotes API (2026)',
    version: '1.1.3',
    description: 'RESTful API for QuickNotes App. Supports full note lifecycle, image thumbnails, attachments (images / video / any file), 2-step nested labels, and AI agent tool calling. Base path is /api (there is NO /v1 prefix).',
  },
  servers: [{ url: '/api', description: 'QuickNotes API Server' }],
  'x-permissions': {
    roles: {
      owner: 'Full access to every endpoint listed here plus /users, /api-keys, /storage and /backups.',
      api: 'Full access to every endpoint listed here. Forbidden (403): DELETE /notes/{id}, POST /notes/empty-trash, moving notes to trash (PATCH /notes/{id}/trash, PUT /notes/{id} with is_trashed=true), DELETE /tags/{id}, and everything under /users, /api-keys, /storage, /backups. Those actions must be performed by the Owner in the web UI.',
    },
    authentication: 'API key (sk_qn_...) via "X-API-Key" header or "Authorization: Bearer sk_qn_..." (single Bearer prefix). Password login is Owner-only.',
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key in X-API-Key header or Authorization: Bearer sk_qn_...',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Note: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          content: { type: 'string' },
          color: { type: 'string', enum: ['default', 'coral', 'peach', 'sand', 'mint', 'sage', 'fog', 'storm', 'blossom', 'clay', 'chalk', 'gray'] },
          is_starred: { type: 'boolean' },
          is_archived: { type: 'boolean' },
          is_trashed: { type: 'boolean' },
          checklist_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                text: { type: 'string' },
                is_completed: { type: 'boolean' },
                position: { type: 'integer' },
              },
            },
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                filename: { type: 'string' },
                original_name: { type: 'string' },
                mime_type: { type: 'string' },
                file_size: { type: 'integer' },
                thumbnail_filename: { type: 'string', nullable: true },
              },
            },
          },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                parent_id: { type: 'string', format: 'uuid', nullable: true },
                color: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/notes': {
      get: {
        summary: 'Query notes',
        description: 'Fetch notes with full-text search, date ranges, multi-label matching, and type filters.',
        parameters: [
          { name: 'view', in: 'query', schema: { type: 'string', enum: ['notes', 'starred', 'archive', 'trash'] } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full text search query' },
          { name: 'tag_ids', in: 'query', schema: { type: 'string' }, description: 'Comma-separated label IDs' },
          { name: 'tag_match', in: 'query', schema: { type: 'string', enum: ['and', 'or'] }, description: 'Match all or any labels' },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'color', in: 'query', schema: { type: 'string' } },
          { name: 'has_images', in: 'query', schema: { type: 'boolean' } },
          { name: 'has_files', in: 'query', schema: { type: 'boolean' } },
          { name: 'has_checklist', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'List of notes' } },
      },
      post: {
        summary: 'Create note',
        description: 'Create a new note with optional checklists, tags, and color.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  color: { type: 'string' },
                  is_starred: { type: 'boolean' },
                  checklist_items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { text: { type: 'string' }, is_completed: { type: 'boolean' } },
                      required: ['text'],
                    },
                  },
                  tag_ids: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created note' } },
      },
    },
    '/notes/counts': {
      get: { summary: 'Note counts by view', description: 'Returns { notes, starred, archive, trash } counts.' },
    },
    '/notes/{id}': {
      get: { summary: 'Get note by ID' },
      put: {
        summary: 'Update note details',
        description: 'Partial update: title, content, color, is_starred, is_archived, checklist_items (full replacement array), tag_ids (full replacement array). API users may set is_trashed=false (restore) but NOT is_trashed=true (trashing is Owner-only).',
      },
      delete: { summary: 'Permanently delete note (Owner only - API users get 403)' },
    },
    '/notes/{id}/star': {
      patch: { summary: 'Toggle note star status' },
    },
    '/notes/{id}/archive': {
      patch: { summary: 'Toggle archive', description: 'Body: {"is_archived": true|false}. Omit to toggle.' },
    },
    '/notes/{id}/color': {
      patch: { summary: 'Change note color', description: 'Body: {"color": "default|coral|peach|sand|mint|sage|fog|storm|blossom|clay|chalk|gray"}' },
    },
    '/notes/{id}/checklist-item/{itemId}': {
      patch: { summary: 'Toggle/edit checklist item', description: 'Body: {"is_completed": bool, "text": "..."}' },
    },
    '/notes/{id}/duplicate': {
      post: { summary: 'Duplicate note (including labels, checklist, attachments)' },
    },
    '/notes/{id}/trash': {
      patch: { summary: 'Move note to trash / restore (Owner only - API users get 403)' },
    },
    '/notes/empty-trash': {
      post: { summary: 'Permanently delete ALL trashed notes (Owner only - API users get 403)' },
    },
    '/tags': {
      get: { summary: 'List 2-step nested labels hierarchy', description: 'Returns { flat, tree }.' },
      post: { summary: 'Create label (root or sub-label; max 2 levels)' },
    },
    '/tags/{id}': {
      put: { summary: 'Update label name, color, parent, or sort order' },
      delete: { summary: 'Delete label (Owner only - API users get 403)' },
    },
    '/attachments/upload': {
      post: {
        summary: 'Upload attachment(s) — image, video, or any file',
        description: `multipart/form-data (NOT JSON). Field name MUST be "files" (up to 10 files per request, max size = MAX_FILE_SIZE_MB env, default 100MB). Optional text field "note_id" links the upload to an existing note. Video thumbnails are auto-generated (ffmpeg). Set the part Content-Type to the real mime type (e.g. ";type=video/mp4"); if it is application/octet-stream the server infers the type from the file extension. Example:
curl -X POST <base>/api/attachments/upload \\
  -H "X-API-Key: sk_qn_..." \\
  -F "files=@/path/to/video.mp4" \\
  -F "note_id=<note-uuid>"
Response: array of attachment objects [{ id, filename, original_name, mime_type, thumbnail_filename, ... }]. To attach uploads to a NEW note, omit note_id and pass the returned ids as attachment_ids[] in POST /notes.`,
      },
    },
    '/attachments/note/{note_id}': {
      post: { summary: 'Upload image/video/file attachment directly to an existing note (multipart, field "files")' },
    },
    '/attachments/{id}/download': {
      get: { summary: 'Download attachment file content' },
    },
    '/attachments/{id}': {
      delete: { summary: 'Delete attachment (both roles allowed)' },
    },
    '/auth/me': {
      get: { summary: 'Current identity', description: 'Returns { authenticated, user: { id, username, role, display_name } }. Use it to verify your key works and which role you have.' },
    },
    '/auth/logout': {
      post: { summary: 'Logout (stateless no-op)' },
    },
  },
};

// AI Agent Tool Call Definitions (OpenAI / Gemini / Claude compatible)
const AI_TOOLS_SPEC = [
  {
    name: 'search_notes',
    description: 'Search notes in QuickNotes app by keyword, date range, or multi-label filters.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to match across title, content, and checklists' },
        tag_ids: { type: 'array', items: { type: 'string' }, description: 'Array of label IDs to filter by' },
        tag_match: { type: 'string', enum: ['and', 'or'], description: 'Whether notes must match ALL or ANY labels' },
        date_from: { type: 'string', description: 'Start date filter (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date filter (YYYY-MM-DD)' },
        view: { type: 'string', enum: ['notes', 'starred', 'archive', 'trash'], default: 'notes' },
      },
    },
  },
  {
    name: 'create_note',
    description: 'Create a new note in QuickNotes with title, content, checklist items, color, and labels.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note body text' },
        color: { type: 'string', enum: ['default', 'coral', 'peach', 'sand', 'mint', 'sage', 'fog', 'storm', 'blossom', 'clay', 'chalk', 'gray'] },
        is_starred: { type: 'boolean', description: 'Whether to star the note' },
        checklist_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              is_completed: { type: 'boolean', default: false },
            },
            required: ['text'],
          },
        },
        tag_ids: { type: 'array', items: { type: 'string' }, description: 'Label IDs to attach' },
      },
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note in QuickNotes.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note UUID' },
        title: { type: 'string' },
        content: { type: 'string' },
        color: { type: 'string' },
        is_starred: { type: 'boolean' },
        tag_ids: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'manage_labels',
    description: 'List, create, or modify labels in QuickNotes (label deletion is NOT available to API users — ask the Owner).',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'update'] },
        name: { type: 'string', description: 'Label name' },
        parent_id: { type: 'string', description: 'Parent label ID for 2-step nested labels (max 2 levels)' },
        color: { type: 'string' },
        sort_order: { type: 'integer' },
        tag_id: { type: 'string', description: 'Label ID for update' },
      },
      required: ['action'],
    },
  },
  {
    name: 'star_note',
    description: 'Star or unstar a note. PATCH /notes/{id}/star (toggles; un-stars also un-archives).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Note UUID' } },
      required: ['id'],
    },
  },
  {
    name: 'archive_note',
    description: 'Archive or unarchive a note. PATCH /notes/{id}/archive with {"is_archived": true|false}.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note UUID' },
        is_archived: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_note_color',
    description: 'Change a note color. PATCH /notes/{id}/color with {"color": "<color>"}.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Note UUID' },
        color: { type: 'string', enum: ['default', 'coral', 'peach', 'sand', 'mint', 'sage', 'fog', 'storm', 'blossom', 'clay', 'chalk', 'gray'] },
      },
      required: ['id', 'color'],
    },
  },
  {
    name: 'toggle_checklist_item',
    description: 'Check/uncheck or edit a checklist item. PATCH /notes/{noteId}/checklist-item/{itemId} with {"is_completed": bool, "text": "..."}.',
    parameters: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'Note UUID' },
        item_id: { type: 'string', description: 'Checklist item UUID' },
        is_completed: { type: 'boolean' },
        text: { type: 'string' },
      },
      required: ['note_id', 'item_id'],
    },
  },
  {
    name: 'duplicate_note',
    description: 'Duplicate a note including labels, checklist and attachments. POST /notes/{id}/duplicate.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Note UUID' } },
      required: ['id'],
    },
  },
  {
    name: 'attach_file',
    description: `Attach a file (image, video, or any file type) to a note. This is a MULTIPART upload — it cannot be sent as JSON. Use curl or equivalent:
  curl -X POST <base>/api/attachments/upload -H "X-API-Key: sk_qn_..." -F "files=@/local/path/file.mp4" -F "note_id=<note-uuid>"
or for a note being created: upload without note_id, then pass the returned attachment ids as attachment_ids[] in POST /notes.
Field name MUST be "files". Up to 10 files per call. Max file size = MAX_FILE_SIZE_MB (default 100MB). Video thumbnails are generated automatically.`,
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Local file path to upload' },
        note_id: { type: 'string', description: 'Existing note UUID (optional; omit when creating a new note)' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'get_note_counts',
    description: 'Get note counts per view. GET /notes/counts → { notes, starred, archive, trash }.',
    parameters: { type: 'object', properties: {} },
  },
];

// Operations an API-key user is FORBIDDEN from performing (server returns 403).
const API_USER_FORBIDDEN = [
  'Delete notes permanently (DELETE /notes/{id})',
  'Empty trash (POST /notes/empty-trash)',
  'Move notes to trash (PATCH /notes/{id}/trash or PUT /notes/{id} with is_trashed=true)',
  'Delete labels (DELETE /tags/{id})',
  'User management, API key management, storage settings, backups (/users, /api-keys, /storage, /backups)',
];

// GET /api/docs/spec
router.get('/spec', (req, res) => {
  res.json(OPENAPI_SPEC);
});

// GET /api/docs/ai-tools
router.get('/ai-tools', (req, res) => {
  res.json({
    tools: AI_TOOLS_SPEC,
    authentication: 'Send "X-API-Key: sk_qn_..." or "Authorization: Bearer sk_qn_..." on EVERY request. These docs endpoints are public; all other /api endpoints require the key.',
    forbidden_for_api_users: API_USER_FORBIDDEN,
    attachment_flow: '1) POST /api/attachments/upload (multipart, field "files", optional "note_id") → get attachment ids. 2) For a new note: POST /api/notes with attachment_ids[]. To add to an existing note: include note_id at upload, or use POST /api/attachments/note/{note_id}.',
    usage: {
      openai: 'Pass the array in the `tools` parameter of OpenAI chat completions.',
      gemini: 'Pass the array in `functionDeclarations` of Gemini GenerativeModel.',
      claude: 'Pass the array in the `tools` parameter of Anthropic messages API.',
    },
  });
});

export default router;
