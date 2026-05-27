// ─────────────────────────────────────────────────────────────────
// Gulsabi Analytics — privacy-safe anonymous tracking
// ─────────────────────────────────────────────────────────────────
// What we DO collect:
//   - A random anonymous browser ID (gulsabi_<uuid>) stored in localStorage
//   - Session/game-session UUIDs (used to stitch events together)
//   - Device type / browser / OS (from User-Agent)
//   - UTM tags from the URL (if a campaign link was used)
//   - Page paths inside this site, scores, durations, completion flags
// What we do NOT collect:
//   - Names, emails, phone numbers, exact addresses, voice, photos
//   - School names, child personal data
//   - Free-text user input
// All inserts go through the public SUPABASE_ANON_KEY. RLS keeps
// the data unreadable from the public client; only the admin
// dashboard (authenticated session) can SELECT.
// ─────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWtzdnlwZnJudmhibnNyb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2OTcsImV4cCI6MjA5NTQzNjY5N30.2kO0Ez_-9XqQguZCE4K5GxxnZNTY_pRqqx1vcOrfcmU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

// ─────────────────────────────────────────────────────────────────
// Anonymous identity
// ─────────────────────────────────────────────────────────────────
const KEYS = {
  anon:        "gulsabi_anonymous_user_id",
  session:     "gulsabi_session_id",
  sessionTime: "gulsabi_session_started_at",
  firstVisit:  "gulsabi_first_visit_at",
  visitCount:  "gulsabi_visit_count",
  lastGameSession: "gulsabi_last_game_session_id"
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getAnonymousUserId() {
  try {
    let id = localStorage.getItem(KEYS.anon);
    if (!id) {
      id = "gulsabi_" + uuid();
      localStorage.setItem(KEYS.anon, id);
      localStorage.setItem(KEYS.firstVisit, new Date().toISOString());
      localStorage.setItem(KEYS.visitCount, "1");
    }
    return id;
  } catch (e) {
    return "gulsabi_" + uuid();
  }
}

export function getSessionId() {
  try {
    const now = Date.now();
    let id = localStorage.getItem(KEYS.session);
    const startedAt = Number(localStorage.getItem(KEYS.sessionTime));
    if (!id || !startedAt || (now - startedAt) > SESSION_TIMEOUT_MS) {
      id = uuid();
      localStorage.setItem(KEYS.session, id);
      const v = parseInt(localStorage.getItem(KEYS.visitCount) || "0", 10);
      if (!Number.isNaN(v)) localStorage.setItem(KEYS.visitCount, String(v + 1));
    }
    localStorage.setItem(KEYS.sessionTime, String(now));
    return id;
  } catch (e) {
    return uuid();
  }
}

function isReturningUser() {
  try {
    const v = parseInt(localStorage.getItem(KEYS.visitCount) || "0", 10);
    return v >= 2;
  } catch (e) { return false; }
}

// ─────────────────────────────────────────────────────────────────
// Device / browser / OS detection (User-Agent heuristics only)
// ─────────────────────────────────────────────────────────────────
export function detectDeviceType() {
  const w = window.innerWidth || screen.width || 0;
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/ipad|tablet|playbook|silk|nexus 7/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.+mobile/.test(ua) || w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua))                return "Edge";
  if (/OPR\/|Opera\//.test(ua))        return "Opera";
  if (/Firefox\//.test(ua))            return "Firefox";
  if (/Chrome\//.test(ua) && !/Edg|OPR/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua))  return "Safari";
  if (/SamsungBrowser\//.test(ua))     return "Samsung";
  return "Other";
}

export function detectOS() {
  const ua = navigator.userAgent || "";
  if (/Windows NT/.test(ua))    return "Windows";
  if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return "macOS";
  if (/Android/.test(ua))       return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Linux/.test(ua))         return "Linux";
  return "Other";
}

export function getUTMParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source:   p.get("utm_source")   || null,
      utm_medium:   p.get("utm_medium")   || null,
      utm_campaign: p.get("utm_campaign") || null,
      utm_content:  p.get("utm_content")  || null,
      utm_term:     p.get("utm_term")     || null
    };
  } catch (e) {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null };
  }
}

function getReferrerSource() {
  try {
    if (!document.referrer) return "direct";
    const u = new URL(document.referrer);
    if (u.hostname === window.location.hostname) return "internal";
    return u.hostname;
  } catch (e) { return "direct"; }
}

function isStandalone() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;
  } catch (e) { return false; }
}

// ─────────────────────────────────────────────────────────────────
// First-time setup of anonymous_users row + session row
// Idempotent — called automatically on first use.
// ─────────────────────────────────────────────────────────────────
let _ensureProfilePromise = null;
function ensureProfile() {
  if (_ensureProfilePromise) return _ensureProfilePromise;
  _ensureProfilePromise = (async () => {
    const anonId = getAnonymousUserId();
    const utm    = getUTMParams();
    const userRow = {
      anonymous_user_id: anonId,
      first_seen_at:     localStorage.getItem(KEYS.firstVisit) || new Date().toISOString(),
      last_seen_at:      new Date().toISOString(),
      device_type:       detectDeviceType(),
      browser:           detectBrowser(),
      os:                detectOS(),
      language:          (navigator.language || "").slice(0, 12),
      source:            getReferrerSource(),
      utm_source:        utm.utm_source,
      utm_medium:        utm.utm_medium,
      utm_campaign:      utm.utm_campaign,
      utm_content:       utm.utm_content,
      utm_term:          utm.utm_term,
      is_returning_user: isReturningUser()
    };
    try {
      await supabase
        .from("anonymous_users")
        .upsert(userRow, { onConflict: "anonymous_user_id", ignoreDuplicates: false });
    } catch (e) {}

    const sessId = getSessionId();
    const sessRow = {
      session_id:        sessId,
      anonymous_user_id: anonId,
      started_at:        new Date().toISOString(),
      entry_page:        window.location.pathname,
      is_pwa_mode:       isStandalone(),
      is_offline_mode:   navigator.onLine === false,
      device_type:       detectDeviceType(),
      browser:           detectBrowser(),
      os:                detectOS()
    };
    try {
      await supabase
        .from("sessions")
        .upsert(sessRow, { onConflict: "session_id", ignoreDuplicates: true });
    } catch (e) {}

    return { anonId, sessId };
  })();
  return _ensureProfilePromise;
}

// ─────────────────────────────────────────────────────────────────
// PII guard — defensive: drop any obvious personal-data keys
// even if a caller mistakenly passes them in metadata.
// ─────────────────────────────────────────────────────────────────
function stripPii(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const banned = /(^|_)(name|first_name|last_name|email|phone|address|school|city|state|zip|postal|gps|latitude|longitude|photo|image_data|voice|chat|message|note|comment)$/i;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (banned.test(k)) continue;
    out[k] = obj[k];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Core event tracker
// ─────────────────────────────────────────────────────────────────
export async function trackEvent(eventName, payload = {}) {
  try {
    const { anonId, sessId } = await ensureProfile();
    const row = {
      event_id:          uuid(),
      event_name:        eventName,
      anonymous_user_id: anonId,
      session_id:        sessId,
      game_session_id:   payload.game_session_id || null,
      game_id:           payload.game_id   || null,
      event_time:        new Date().toISOString(),
      level_number:      Number.isFinite(payload.level_number)     ? payload.level_number     : null,
      score:             Number.isFinite(payload.score)            ? payload.score            : null,
      duration_seconds:  Number.isFinite(payload.duration_seconds) ? payload.duration_seconds : null,
      metadata:          stripPii({
        game_name:  payload.game_name || null,
        page_path:  window.location.pathname,
        page_query: window.location.search,
        referrer:   getReferrerSource(),
        is_pwa:     isStandalone(),
        ...(payload.metadata || {})
      })
    };
    await supabase.from("game_events").insert(row);
  } catch (err) {
    if (typeof console !== "undefined") console.warn("Gulsabi analytics:", err && err.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// Game session lifecycle
// ─────────────────────────────────────────────────────────────────
const _activeGameSessions = new Map();

export async function startGameSession(gameId, gameName) {
  const { anonId, sessId } = await ensureProfile();
  const gsid = uuid();
  const start = new Date();
  const meta = {
    game_session_id:   gsid,
    anonymous_user_id: anonId,
    session_id:        sessId,
    game_id:           gameId,
    game_name:         gameName || gameId,
    started_at:        start.toISOString()
  };
  _activeGameSessions.set(gsid, { gameId, gameName, startedAt: start.getTime(), score: null, level: null, hints: 0, mistakes: 0 });
  try { localStorage.setItem(KEYS.lastGameSession, gsid); } catch (e) {}
  try { await supabase.from("game_sessions").insert(meta); } catch (e) {}
  trackEvent("game_start", { game_id: gameId, game_name: gameName, game_session_id: gsid });
  return gsid;
}

export async function endGameSession(gameSessionId, payload = {}) {
  if (!gameSessionId) return 0;
  const state = _activeGameSessions.get(gameSessionId);
  const startedAtMs = state ? state.startedAt : Date.now();
  const dur = Math.max(0, Math.round((Date.now() - startedAtMs) / 1000));
  const patch = {
    ended_at:         new Date().toISOString(),
    duration_seconds: dur,
    score:            Number.isFinite(payload.score)         ? payload.score         : (state ? state.score : null),
    highest_score:    Number.isFinite(payload.highest_score) ? payload.highest_score : null,
    highest_level:    Number.isFinite(payload.highest_level) ? payload.highest_level : (state ? state.level : null),
    completed:        payload.completed === true,
    failed:           payload.failed    === true,
    exited:           payload.exited    === true,
    hints_used:       state ? state.hints   : 0,
    mistakes_count:   state ? state.mistakes : 0
  };
  try {
    await supabase.from("game_sessions").update(patch).eq("game_session_id", gameSessionId);
  } catch (e) {}
  const eventName = patch.completed ? "game_complete"
                  : patch.failed    ? "game_failed"
                  : patch.exited    ? "game_exit"
                  : "game_end";
  trackEvent(eventName, {
    game_id:          state ? state.gameId : payload.game_id,
    game_name:        state ? state.gameName : payload.game_name,
    game_session_id:  gameSessionId,
    score:            patch.score,
    duration_seconds: dur,
    level_number:     patch.highest_level
  });
  _activeGameSessions.delete(gameSessionId);
  return dur;
}

export function trackScore(gameSessionId, score, gameId, gameName) {
  const state = _activeGameSessions.get(gameSessionId);
  if (state) state.score = score;
  return trackEvent("score_update", { game_id: gameId || (state && state.gameId), game_name: gameName || (state && state.gameName), game_session_id: gameSessionId, score });
}

export function trackLevelStart(gameSessionId, levelNumber, gameId, gameName) {
  const state = _activeGameSessions.get(gameSessionId);
  if (state) state.level = levelNumber;
  return trackEvent("level_start", { game_id: gameId || (state && state.gameId), game_name: gameName || (state && state.gameName), game_session_id: gameSessionId, level_number: levelNumber });
}
export function trackLevelComplete(gameSessionId, levelNumber, score, gameId, gameName) {
  const state = _activeGameSessions.get(gameSessionId);
  if (state) state.level = levelNumber;
  return trackEvent("level_complete", { game_id: gameId || (state && state.gameId), game_name: gameName || (state && state.gameName), game_session_id: gameSessionId, level_number: levelNumber, score });
}
export function trackLevelFailed(gameSessionId, levelNumber, gameId, gameName) {
  const state = _activeGameSessions.get(gameSessionId);
  return trackEvent("level_failed", { game_id: gameId || (state && state.gameId), game_name: gameName || (state && state.gameName), game_session_id: gameSessionId, level_number: levelNumber });
}
export function trackHint(gameSessionId) {
  const state = _activeGameSessions.get(gameSessionId);
  if (state) state.hints += 1;
}
export function trackMistake(gameSessionId) {
  const state = _activeGameSessions.get(gameSessionId);
  if (state) state.mistakes += 1;
}

export function trackGameExit(gameSessionId, gameId, gameName) {
  return endGameSession(gameSessionId, { exited: true, game_id: gameId, game_name: gameName });
}

export function trackRetry(gameId, gameName) {
  return trackEvent("retry_game", { game_id: gameId, game_name: gameName });
}

// ─────────────────────────────────────────────────────────────────
// PWA install tracking
// ─────────────────────────────────────────────────────────────────
async function _pwaInsert(status, when) {
  try {
    const { anonId, sessId } = await ensureProfile();
    const row = {
      anonymous_user_id: anonId,
      session_id:        sessId,
      install_status:    status,
      platform:          detectOS(),
      browser:           detectBrowser(),
      device_type:       detectDeviceType()
    };
    if (status === "shown")     row.install_prompt_shown_at   = when || new Date().toISOString();
    if (status === "accepted")  row.install_prompt_clicked_at = when || new Date().toISOString();
    if (status === "dismissed") row.install_prompt_clicked_at = when || new Date().toISOString();
    if (status === "installed") row.installed_at              = when || new Date().toISOString();
    await supabase.from("pwa_installs").insert(row);
  } catch (e) {}
}
export function trackPWAInstallShown()     { _pwaInsert("shown");     return trackEvent("install_prompt_shown");     }
export function trackPWAInstallAccepted()  { _pwaInsert("accepted");  return trackEvent("install_prompt_accepted");  }
export function trackPWAInstallDismissed() { _pwaInsert("dismissed"); return trackEvent("install_prompt_dismissed"); }
export function trackAppInstalled()        { _pwaInsert("installed"); return trackEvent("app_installed");            }

// ─────────────────────────────────────────────────────────────────
// Error reporting (defensive: no PII, message truncated)
// ─────────────────────────────────────────────────────────────────
export async function trackError(error, context = {}) {
  try {
    const { anonId, sessId } = await ensureProfile();
    const msg = (error && error.message) ? String(error.message) : String(error || "unknown");
    const stack = (error && error.stack) ? String(error.stack).slice(0, 2000) : null;
    await supabase.from("errors").insert({
      anonymous_user_id: anonId,
      session_id:        sessId,
      game_id:           context.game_id || null,
      error_type:        context.type || (error && error.name) || "Error",
      error_message:     msg.slice(0, 500),
      error_stack:       stack,
      page_url:          window.location.pathname,
      browser:           detectBrowser(),
      device_type:       detectDeviceType()
    });
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────
// Page-level setup: call from main.js
// Fires page_view, hooks visibility/pagehide for exit tracking,
// and listens for PWA install lifecycle.
// ─────────────────────────────────────────────────────────────────
let _exitFired = false;
export function setupPageTracking() {
  // First page view (must run AFTER ensureProfile resolves, but trackEvent waits)
  trackEvent("page_view");

  // game_card_view: any element with data-game-card-id near the viewport
  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = e.target.getAttribute("data-game-card-id");
        if (id && !seen.has(id)) {
          seen.add(id);
          trackEvent("game_card_view", { game_id: id });
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-game-card-id]").forEach(el => io.observe(el));
  }

  function flushExit() {
    if (_exitFired) return;
    _exitFired = true;
    try {
      const sessId = localStorage.getItem(KEYS.session);
      const startedAt = Number(localStorage.getItem(KEYS.sessionTime)) || Date.now();
      if (sessId) {
        const dur = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
        supabase.from("sessions").update({
          ended_at:                 new Date().toISOString(),
          session_duration_seconds: dur,
          exit_page:                window.location.pathname
        }).eq("session_id", sessId);
      }
    } catch (e) {}
    _activeGameSessions.forEach((_, gsid) => {
      try { endGameSession(gsid, { exited: true }); } catch (e) {}
    });
  }
  window.addEventListener("pagehide", flushExit);
  window.addEventListener("beforeunload", flushExit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushExit();
  });

  window.addEventListener("offline", () => trackEvent("offline_play"));

  window.addEventListener("beforeinstallprompt", () => trackPWAInstallShown());
  window.addEventListener("appinstalled",        () => trackAppInstalled());

  window.addEventListener("error", (ev) => {
    trackError(ev.error || new Error(ev.message || "error"), { type: "window_error" });
  });
  window.addEventListener("unhandledrejection", (ev) => {
    trackError(ev.reason || new Error("unhandledrejection"), { type: "unhandled_rejection" });
  });
}
