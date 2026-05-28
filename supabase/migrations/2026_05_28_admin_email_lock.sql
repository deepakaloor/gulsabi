-- ─────────────────────────────────────────────────────────────────
-- Gulsabi analytics — restrict SELECT to admin emails only
-- ─────────────────────────────────────────────────────────────────
-- Why: with Google OAuth enabled, any Google user who clicks
-- "Continue with Google" gets the `authenticated` role. Without
-- this migration, that user could query every analytics table.
--
-- This migration:
--   1. Creates a `public.admin_emails` allowlist table.
--   2. Seeds it with the current owner email (edit as needed).
--   3. Replaces every `auth_select_*` policy on the analytics tables
--      with one that checks the JWT email against admin_emails.
--   4. Adds a self-check SELECT policy on admin_emails itself so the
--      dashboard can verify "am I an admin?" without leaking the list.
--
-- Safe to re-run.  Idempotent.
-- ─────────────────────────────────────────────────────────────────

-- 1) Allowlist table ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Seed: replace this email or add more rows for additional admins
INSERT INTO public.admin_emails (email)
VALUES ('pixnutmedia@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- A signed-in user can see ONLY their own row (so the client can
-- check "is my email in the table?"). Listing all admins would leak.
DROP POLICY IF EXISTS "auth_select_admin_emails" ON public.admin_emails;
CREATE POLICY "auth_select_admin_emails" ON public.admin_emails
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- 2) Replace every analytics SELECT policy with the email-locked one
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'anonymous_users','sessions','game_sessions',
    'game_events','pwa_installs','errors'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "auth_select_%s" ON public.%I
         FOR SELECT TO authenticated
         USING (EXISTS (
           SELECT 1 FROM public.admin_emails ae
           WHERE ae.email = auth.jwt() ->> ''email''
         ))',
      t, t
    );
  END LOOP;
END $$;

-- 3) Helpful convenience: a single function the dashboard can call
--    to ask "is this session an admin?" without firing 6 table probes.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE email = auth.jwt() ->> 'email'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Done. Non-admin signed-in users will now see empty result sets
-- from every analytics table — RLS silently filters them out.
