import { Router } from 'express';

const router = Router();

// OpenAPI 3.1 Specification JSON
const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'QuickNotes API (2026)',
    version: '1.0.0',
    description: 'RESTful API for QuickNotes App. Supports full note lifecycle, image thumbnails, attachments, 2-step nested labels, and AI agent tool calling.',
  },
  servers: [{ url: '/api', description: 'QuickNotes API Server' }],
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
    '/notes/{id}': {
      get: { summary: 'Get note by ID' },
      put: { summary: 'Update note details' },
      delete: { summary: 'Delete note (Owner only - API users forbidden)' },
    },
    '/notes/{id}/star': {
      patch: { summary: 'Toggle note star status' },
    },
    '/tags': {
      get: { summary: 'List 2-step nested labels hierarchy' },
      post: { summary: 'Create label (root or sub-label)' },
    },
    '/tags/{id}': {
      put: { summary: 'Update label name, color, or parent' },
      delete: { summary: 'Delete label (Owner only - API users forbidden)' },
    },
    '/attachments/note/{note_id}': {
      post: { summary: 'Upload image or file attachment to note' },
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
    description: 'List, create, or modify labels in QuickNotes.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'update', 'delete'] },
        name: { type: 'string', description: 'Label name' },
        parent_id: { type: 'string', description: 'Parent label ID for 2-step nested labels' },
        color: { type: 'string' },
        tag_id: { type: 'string', description: 'Label ID for update/delete' },
      },
      required: ['action'],
    },
  },
];

// GET /api/docs/spec
router.get('/spec', (req, res) => {
  res.json(OPENAPI_SPEC);
});

// GET /api/docs/ai-tools
router.get('/ai-tools', (req, res) => {
  res.json({
    tools: AI_TOOLS_SPEC,
    usage: {
      openai: 'Pass the array in the `tools` parameter of OpenAI chat completions.',
      gemini: 'Pass the array in `functionDeclarations` of Gemini GenerativeModel.',
      claude: 'Pass the array in the `tools` parameter of Anthropic messages API.',
    },
  });
});

export default router;
