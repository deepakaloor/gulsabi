// Gulsabi KIDS data project — public client config.
//
// This points at the SEPARATE Supabase project that holds parent accounts +
// child profiles (NOT the analytics/newsletter project). The anon key is a
// public, RLS-gated key and is safe to ship in the app.
//
// Provision the project and paste its values below — see
// docs/android-app/supabase-kids-setup.md for the 5-minute setup.
window.GULSABI_KIDS = {
  SUPABASE_URL: "https://iwokbrwuzkgeljurwzaq.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b2ticnd1emtnZWxqdXJ3emFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTMwOTUsImV4cCI6MjA5NjY2OTA5NX0.07PJfM7vVaRQat27LyhLe_z8aA51A_TI_-Yl5NtAGXI",
  // Bump when the consent text materially changes; parents re-consent.
  CONSENT_VERSION: "2026-06-12", // 2026-06-12: added the optional Learn cloud-sync opt-in
};
