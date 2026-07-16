-- ClauseCheck schema (Postgres / Neon / Supabase)
-- Run once: psql $DATABASE_URL -f lib/db/schema.sql

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  pro_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'none',
  pro_until TIMESTAMPTZ,
  team_id TEXT REFERENCES teams(id),
  team_role TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pro history metadata only. Never store full contract in result.contractReview.source.
-- RLS enabled in migrations / ensureSchema (no client policies).
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_name TEXT,
  locale TEXT NOT NULL DEFAULT 'zh',
  score_num INT NOT NULL DEFAULT 0,
  score_text TEXT NOT NULL DEFAULT '',
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Ephemeral revision bodies: hard-DELETED by /api/cron/purge-contract-data within 24h.
-- No soft-delete columns (is_deleted / deleted_at). original_file must stay NULL.
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'zh',
  original_text TEXT NOT NULL DEFAULT '',
  revised_contract TEXT NOT NULL DEFAULT '',
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_file TEXT,
  original_file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_team ON reports(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_revisions_user ON revisions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_team ON revisions(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_created_at ON revisions(created_at);

CREATE TABLE IF NOT EXISTS app_metrics (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pay_per_use_credits (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppu_credits_email ON pay_per_use_credits(email) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS scan_quota (
  id TEXT PRIMARY KEY,
  trial_start TIMESTAMPTZ,
  month_key TEXT NOT NULL DEFAULT '',
  scan_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(name, created_at DESC);
