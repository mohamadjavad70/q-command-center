-- Migration: create user_memory table
-- Replaces file-based memory-db.json persistence with Supabase Postgres.

CREATE TABLE IF NOT EXISTS user_memory (
  user_id     TEXT        PRIMARY KEY,
  profile     JSONB       NOT NULL DEFAULT '{}',
  interests   JSONB       NOT NULL DEFAULT '[]',
  memory      JSONB       NOT NULL DEFAULT '[]',
  updated_at  BIGINT      NOT NULL DEFAULT 0
);

-- Enable Row Level Security (read/write only via service-role key from backend)
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- No public access — all operations go through the backend with service-role key
CREATE POLICY "deny_public_access" ON user_memory
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false);
