-- PostgreSQL 18 Schema for QuickNotes App (Advanced 2026 Edition)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table (2 roles: 'owner' and 'api')
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL CHECK (role IN ('owner', 'api')),
    display_name VARCHAR(128) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2-Step Nested Labels Table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    parent_id UUID REFERENCES tags(id) ON DELETE CASCADE NULL,
    color VARCHAR(32) NOT NULL DEFAULT 'default',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    color VARCHAR(32) NOT NULL DEFAULT 'default',
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist Items Table
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    text TEXT NOT NULL DEFAULT '',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size BIGINT NOT NULL,
    width INTEGER NULL,
    height INTEGER NULL,
    thumbnail_filename VARCHAR(255) NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
    storage_path TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note-Tags Junction Table
CREATE TABLE IF NOT EXISTS note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- API Keys Table for AI Agents
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(128) UNIQUE NOT NULL,
    last_used_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Storage Configurations Table (Local, S3/R2/B2, Google Drive)
CREATE TABLE IF NOT EXISTS storage_configs (
    id VARCHAR(32) PRIMARY KEY,
    provider_type VARCHAR(32) NOT NULL CHECK (provider_type IN ('local', 's3', 'gdrive')),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backups Record Table
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
    backup_type VARCHAR(32) NOT NULL DEFAULT 'database_only', -- 'database_only' | 'full'
    includes_attachments BOOLEAN NOT NULL DEFAULT FALSE,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled Backups Configuration Table
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

-- Incremental column alterations
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tags(id) ON DELETE CASCADE NULL;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(32) NOT NULL DEFAULT 'local';
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS storage_path TEXT NULL;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS backup_type VARCHAR(32) NOT NULL DEFAULT 'database_only';
ALTER TABLE backups ADD COLUMN IF NOT EXISTS includes_attachments BOOLEAN NOT NULL DEFAULT FALSE;

-- Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(is_trashed, is_archived, is_starred, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_note ON checklist_items(note_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
