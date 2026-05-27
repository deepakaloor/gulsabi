// Gulsabi Analytics - Privacy-safe anonymous tracking
// Uses Supabase Free Plan. No personal child data collected.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWtzdnlwZnJudmhibnNyb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2OTcsImV4cCI6MjA5NTQzNjY5N30.2kO0Ez_-9XqQguZCE4K5GxxnZNTY_pRqqx1vcOrfcmU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getOrCreateLocalId(key) {
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

function getSessionId() {
  const key = "gulsabi_session_id";
  const timeKey = "gulsabi_session_started_at";
  const now = Date.now();
  const sessionTimeout = 30 * 60 * 1000;
  let sessionId = localStorage.getItem(key);
  let startedAt = Number(localStorage.getItem(timeKey));
  if (!sessionId || !startedAt || now - startedAt > sessionTimeout) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
  }
  localStorage.setItem(timeKey, String(now));
  return sessionId;
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 768) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

const anonymousUserId = getOrCreateLocalId("gulsabi_anonymous_user_id");

export async function trackEvent(eventName, data = {}) {
  try {
    const payload = {
      event_name: eventName,
      game_name: data.game_name || null,
      page_path: window.location.pathname,
      anonymous_user_id: anonymousUserId,
      session_id: getSessionId(),
      score: Number.isInteger(data.score) ? data.score : null,
      time_spent_seconds: Number.isInteger(data.time_spent_seconds)
        ? data.time_spent_seconds
        : null,
      device_type: getDeviceType(),
      referrer: document.referrer || null
    };
    const { error } = await supabase.from("game_events").insert(payload);
    if (error) {
      console.error("Gulsabi analytics error:", error.message);
    }
  } catch (err) {
    console.error("Gulsabi analytics failed:", err);
  }
}
