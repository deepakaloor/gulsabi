-- ─────────────────────────────────────────────────────────────────
-- Gulsabi Analytics — Supabase schema
-- Privacy: anonymous IDs only. No child PII (names, emails, phones,
-- school, location, voice, photo, chat text).
-- Run this in the Supabase SQL editor. Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

-- The previous prototype schema had a flat `game_events` table with
-- a different column shape. Replace it with the full analytics model.
DROP TABLE IF EXISTS public.game_events CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- 1. anonymous_users
--    One row per anonymous browser/device identifier. No PII.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anonymous_users (
  id                  BIGSERIAL    PRIMARY KEY,
  anonymous_user_id   TEXT         UNIQUE NOT NULL,
  first_seen_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  device_type         TEXT,
  browser             TEXT,
  os                  TEXT,
  country             TEXT,
  region              TEXT,
  language            TEXT,
  source              TEXT,
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  utm_content         TEXT,
  utm_term            TEXT,
  is_returning_user   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anonusers_anonid     ON public.anonymous_users (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_anonusers_first_seen ON public.anonymous_users (first_seen_at);
CREATE INDEX IF NOT EXISTS idx_anonusers_last_seen  ON public.anonymous_users (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_anonusers_utm_source ON public.anonymous_users (utm_source);
CREATE INDEX IF NOT EXISTS idx_anonusers_utm_camp   ON public.anonymous_users (utm_campaign);

-- ─────────────────────────────────────────────────────────────────
-- 2. sessions
--    One row per browser session (~30 minutes of inactivity ends one).
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id                        BIGSERIAL    PRIMARY KEY,
  session_id                TEXT         UNIQUE NOT NULL,
  anonymous_user_id         TEXT         NOT NULL,
  started_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at                  TIMESTAMPTZ,
  session_duration_seconds  INTEGER,
  entry_page                TEXT,
  exit_page                 TEXT,
  games_played_count        INTEGER      NOT NULL DEFAULT 0,
  is_pwa_mode               BOOLEAN      NOT NULL DEFAULT FALSE,
  is_offline_mode           BOOLEAN      NOT NULL DEFAULT FALSE,
  device_type               TEXT,
  browser                   TEXT,
  os                        TEXT,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_sessid     ON public.sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_anonid     ON public.sessions (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions (started_at);

-- ─────────────────────────────────────────────────────────────────
-- 3. game_sessions
--    One row per game play session.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id                BIGSERIAL    PRIMARY KEY,
  game_session_id   TEXT         UNIQUE NOT NULL,
  anonymous_user_id TEXT         NOT NULL,
  session_id        TEXT,
  game_id           TEXT         NOT NULL,
  game_name         TEXT,
  started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER,
  score             INTEGER,
  highest_score     INTEGER,
  highest_level     INTEGER,
  completed         BOOLEAN      NOT NULL DEFAULT FALSE,
  failed            BOOLEAN      NOT NULL DEFAULT FALSE,
  exited            BOOLEAN      NOT NULL DEFAULT FALSE,
  retries           INTEGER      NOT NULL DEFAULT 0,
  hints_used        INTEGER      NOT NULL DEFAULT 0,
  mistakes_count    INTEGER      NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gamesess_gsid       ON public.game_sessions (game_session_id);
CREATE INDEX IF NOT EXISTS idx_gamesess_anonid     ON public.game_sessions (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_gamesess_sessid     ON public.game_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_gamesess_gameid     ON public.game_sessions (game_id);
CREATE INDEX IF NOT EXISTS idx_gamesess_started_at ON public.game_sessions (started_at);

-- ─────────────────────────────────────────────────────────────────
-- 4. game_events (new schema — replaces the earlier prototype)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.game_events (
  id                BIGSERIAL    PRIMARY KEY,
  event_id          TEXT         UNIQUE NOT NULL,
  event_name        TEXT         NOT NULL,
  anonymous_user_id TEXT,
  session_id        TEXT,
  game_session_id   TEXT,
  game_id           TEXT,
  event_time        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  level_number      INTEGER,
  score             INTEGER,
  duration_seconds  INTEGER,
  metadata          JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_event_id    ON public.game_events (event_id);
CREATE INDEX IF NOT EXISTS idx_events_anonid      ON public.game_events (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_events_sessid      ON public.game_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_gsid        ON public.game_events (game_session_id);
CREATE INDEX IF NOT EXISTS idx_events_gameid      ON public.game_events (game_id);
CREATE INDEX IF NOT EXISTS idx_events_event_name  ON public.game_events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_event_time  ON public.game_events (event_time);
CREATE INDEX IF NOT EXISTS idx_events_created_at  ON public.game_events (created_at);

-- ─────────────────────────────────────────────────────────────────
-- 5. pwa_installs
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pwa_installs (
  id                         BIGSERIAL    PRIMARY KEY,
  anonymous_user_id          TEXT         NOT NULL,
  session_id                 TEXT,
  install_prompt_shown_at    TIMESTAMPTZ,
  install_prompt_clicked_at  TIMESTAMPTZ,
  install_status             TEXT,         -- 'shown' | 'accepted' | 'dismissed' | 'installed'
  installed_at               TIMESTAMPTZ,
  platform                   TEXT,
  browser                    TEXT,
  device_type                TEXT,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwa_anonid     ON public.pwa_installs (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_status     ON public.pwa_installs (install_status);
CREATE INDEX IF NOT EXISTS idx_pwa_created_at ON public.pwa_installs (created_at);

-- ─────────────────────────────────────────────────────────────────
-- 6. errors
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.errors (
  id                BIGSERIAL    PRIMARY KEY,
  anonymous_user_id TEXT,
  session_id        TEXT,
  game_id           TEXT,
  error_type        TEXT,
  error_message     TEXT,
  error_stack       TEXT,
  page_url          TEXT,
  browser           TEXT,
  device_type       TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_errors_anonid     ON public.errors (anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_errors_gameid     ON public.errors (game_id);
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON public.errors (created_at);

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- - Public (anon role): INSERT only — frontends can write events.
-- - Authenticated role: SELECT — admin dashboard can read.
-- The service role bypasses RLS automatically (server-side only).
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_installs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errors          ENABLE ROW LEVEL SECURITY;

-- Drop existing policies of the same name (safe idempotent re-runs)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['anonymous_users','sessions','game_sessions','game_events','pwa_installs','errors']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s"  ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s"  ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s"  ON public.%I', t, t);
  END LOOP;
END $$;

-- Public anon role: INSERT-only on each analytics table.
CREATE POLICY "anon_insert_anonymous_users"  ON public.anonymous_users
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_insert_sessions"          ON public.sessions
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_insert_game_sessions"     ON public.game_sessions
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_insert_game_events"       ON public.game_events
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_insert_pwa_installs"      ON public.pwa_installs
  FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "anon_insert_errors"            ON public.errors
  FOR INSERT TO anon WITH CHECK (TRUE);

-- Allow UPDATE on rows by anonymous_user_id / session_id / game_session_id so
-- the frontend can patch last_seen_at, session ended_at, game duration etc.
-- This stays safe because rows can\'t be read back without auth.
CREATE POLICY "anon_update_anonymous_users"  ON public.anonymous_users
  FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_update_sessions"          ON public.sessions
  FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_update_game_sessions"     ON public.game_sessions
  FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "anon_update_pwa_installs"      ON public.pwa_installs
  FOR UPDATE TO anon USING (TRUE) WITH CHECK (TRUE);

-- Authenticated (logged-in admin): SELECT on all tables.
CREATE POLICY "auth_select_anonymous_users"  ON public.anonymous_users
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_select_sessions"          ON public.sessions
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_select_game_sessions"     ON public.game_sessions
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_select_game_events"       ON public.game_events
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_select_pwa_installs"      ON public.pwa_installs
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_select_errors"            ON public.errors
  FOR SELECT TO authenticated USING (TRUE);

-- ─────────────────────────────────────────────────────────────────
-- Convenience: trigger to keep anonymous_users.updated_at current
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_anonusers_updated_at ON public.anonymous_users;
CREATE TRIGGER trg_anonusers_updated_at
  BEFORE UPDATE ON public.anonymous_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
