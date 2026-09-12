import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  console.log('Running database migrations...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run base schema
    await query(schemaSql);

    // Apply incremental column alterations for existing tables
    await query(`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE tags ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tags(id) ON DELETE CASCADE NULL;
      ALTER TABLE tags ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
      ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(32) NOT NULL DEFAULT 'local';
      ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_path TEXT NULL;
      ALTER TABLE attachments ALTER COLUMN note_id DROP NOT NULL;
      ALTER TABLE backups ADD COLUMN IF NOT EXISTS backup_type VARCHAR(32) NOT NULL DEFAULT 'database_only';
      ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_attachments BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS backup_schedules (
        id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        interval_days INT NOT NULL DEFAULT 1,
        backup_type VARCHAR(32) NOT NULL DEFAULT 'database_only',
        storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
        retention_count INT NOT NULL DEFAULT 7,
        last_run_at TIMESTAMPTZ NULL,
        next_run_at TIMESTAMPTZ NULL,
        last_status VARCHAR(32) NULL,
        last_error TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Ensure default schedule record exists
      INSERT INTO backup_schedules (id, enabled, interval_days, backup_type, storage_provider, retention_count)
      VALUES ('default', FALSE, 1, 'database_only', 'local', 7)
      ON CONFLICT (id) DO NOTHING;

      -- Copy is_pinned to is_starred if is_pinned column exists
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notes' AND column_name = 'is_pinned'
        ) THEN
          UPDATE notes SET is_starred = is_pinned WHERE is_starred IS FALSE AND is_pinned IS TRUE;
        END IF;
      END $$;

      -- Drop old single-column unique constraint on tags name if exists
      ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;

      -- Add unique constraint on tags(name, parent_id) if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_tag_name_parent'
        ) THEN
          ALTER TABLE tags ADD CONSTRAINT uq_tag_name_parent UNIQUE (name, parent_id);
        END IF;
      END $$;
    `);

    // Ensure default local storage config exists
    await query(`
      INSERT INTO storage_configs (id, provider_type, is_active, config_json)
      VALUES ('local', 'local', TRUE, '{"baseDir": "./uploads"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Ensure default initial Owner account exists if users table is empty
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0]?.count || '0', 10) === 0) {
      const { hashPassword } = await import('../services/auth.js');
      const ownerUsername = process.env.DEFAULT_OWNER_USERNAME || process.env.INITIAL_ADMIN_USER || 'owner';
      const ownerPassword = process.env.DEFAULT_OWNER_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD || 'quicknotes_owner_password_2026';
      const apiUsername   = process.env.DEFAULT_API_USERNAME || 'api_user';
      const apiPassword   = process.env.DEFAULT_API_PASSWORD || 'quicknotes_api_password_2026';

      const ownerPassHash = await hashPassword(ownerPassword);
      const apiPassHash = await hashPassword(apiPassword);

      await query(
        `INSERT INTO users (username, password_hash, role, display_name)
         VALUES 
         ($1, $2, 'owner', 'App Owner'),
         ($3, $4, 'api', 'AI Agent Assistant')
         ON CONFLICT (username) DO NOTHING`,
        [ownerUsername, ownerPassHash, apiUsername, apiPassHash]
      );
      console.log(`Initialized default accounts: "${ownerUsername}" (owner) and "${apiUsername}" (api).`);
    }

    // Ensure default 2-step nested labels hierarchy exists
    await ensureDefaultLabels();

    console.log('Database schema successfully migrated.');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

export const DEFAULT_LABEL_TREE: {
  name: string;
  color: string;
  children: string[];
}[] = [
  {
    name: 'Personal',
    color: 'storm',
    children: ['Wisdom', 'Self improvement', 'Spiritual', 'Orqanise-Declutter', 'Study'],
  },
  {
    name: 'Health',
    color: 'blossom',
    children: ['Diabetes', 'Exercise'],
  },
  {
    name: 'Recipe',
    color: 'coral',
    children: ['masala'],
  },
  {
    name: 'AI',
    color: 'mint',
    children: ['claude', 'AI Agent'],
  },
  {
    name: 'Relationships',
    color: 'sand',
    children: ['Partner', 'Kids'],
  },
  {
    name: 'Books',
    color: 'storm',
    children: [],
  },
  {
    name: 'Github',
    color: 'fog',
    children: [],
  },
  {
    name: 'Business',
    color: 'mint',
    children: ['Local seo', 'Employees'],
  },
  {
    name: 'Finance',
    color: 'amber',
    children: ['Trading'],
  },
];

export async function ensureDefaultLabels() {
  for (let rootIndex = 0; rootIndex < DEFAULT_LABEL_TREE.length; rootIndex++) {
    const rootDef = DEFAULT_LABEL_TREE[rootIndex];

    // Check if root label exists
    const rootRes = await query(
      'SELECT id, name FROM tags WHERE parent_id IS NULL AND LOWER(name) = LOWER($1)',
      [rootDef.name]
    );

    let rootId: string;
    if (rootRes.rows.length === 0) {
      const insRes = await query(
        'INSERT INTO tags (name, parent_id, color, sort_order) VALUES ($1, NULL, $2, $3) RETURNING id',
        [rootDef.name, rootDef.color, rootIndex]
      );
      rootId = insRes.rows[0].id;
    } else {
      rootId = rootRes.rows[0].id;
      await query('UPDATE tags SET sort_order = $1 WHERE id = $2', [rootIndex, rootId]);
    }

    // Process children
    for (let childIndex = 0; childIndex < rootDef.children.length; childIndex++) {
      const childName = rootDef.children[childIndex];

      // Handle Organise-Declutter -> Orqanise-Declutter if previously created with a 'g'
      if (childName === 'Orqanise-Declutter') {
        await query(
          "UPDATE tags SET name = 'Orqanise-Declutter' WHERE parent_id = $1 AND LOWER(name) = 'organise-declutter'",
          [rootId]
        );
      }

      const childRes = await query(
        'SELECT id FROM tags WHERE parent_id = $1 AND LOWER(name) = LOWER($2)',
        [rootId, childName]
      );

      if (childRes.rows.length === 0) {
        await query(
          'INSERT INTO tags (name, parent_id, color, sort_order) VALUES ($1, $2, $3, $4)',
          [childName, rootId, rootDef.color, childIndex]
        );
      } else {
        await query('UPDATE tags SET sort_order = $1 WHERE id = $2', [childIndex, childRes.rows[0].id]);
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
