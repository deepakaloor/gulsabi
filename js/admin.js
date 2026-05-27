// Gulsabi Admin Dashboard
// Privacy-safe: this file uses the public Supabase ANON key only. The service
// role key MUST stay server-side and is never referenced here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWtzdnlwZnJudmhibnNyb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMzc5ODYsImV4cCI6MjA2MzkxMzk4Nn0.VktRIH-8HNwXUSTnLdPuA64H5y6VgRFNvuTbDBrCHu4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── DOM ─────────────────────────────────────────────── */
const loginBox  = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const dashStatus = document.getElementById("dashStatus");
let recoveryBox = null;

/* ── Module-level state (latest loaded data, used for exports) ─── */
let currentEvents = [];        // raw rows from game_events table
let currentGameReport = [];    // computed per-game stats
let currentSummary = {};       // computed summary metrics
let currentRecent = [];        // top 20 recent events (display order)

/* ── Auth recovery (password reset link) ────────────── */
async function handleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.substring(1));
  const type = params.get("type");
  const accessToken = params.get("access_token");
  if (type === "recovery" && accessToken) {
    const refreshToken = params.get("refresh_token") || "";
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    history.replaceState(null, "", window.location.pathname);
    showResetPasswordBox();
    return true;
  }
  return false;
}

function showResetPasswordBox() {
  loginBox.style.display = "none";
  dashboard.style.display = "none";
  if (!recoveryBox) {
    recoveryBox = document.createElement("div");
    recoveryBox.id = "recoveryBox";
    recoveryBox.style.cssText = "max-width:380px;margin:80px auto;background:#fff;padding:36px;border-radius:18px;box-shadow:0 4px 14px rgba(0,0,0,0.06);border:1px solid rgba(0,0,0,0.08);text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;";
    recoveryBox.innerHTML = '<h2 style="font-size:1.2rem;font-weight:600;letter-spacing:-0.01em;margin-bottom:6px;color:#1d1d1f;">Set new password</h2><p style="color:#6e6e73;margin-bottom:22px;font-size:0.88rem;">Enter your new password below.</p><input id="newPassword" type="password" placeholder="New password (min 8 chars)" style="width:100%;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;font-size:0.95rem;box-sizing:border-box;margin-bottom:10px;font-family:inherit;" /><input id="confirmPassword" type="password" placeholder="Confirm new password" style="width:100%;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;font-size:0.95rem;box-sizing:border-box;margin-bottom:14px;font-family:inherit;" /><div id="recoveryError" style="color:#d70015;font-size:0.82rem;margin-bottom:12px;min-height:1.1em;"></div><button id="setPasswordBtn" style="width:100%;padding:11px;background:#1d1d1f;color:#fff;border:none;border-radius:8px;font-size:0.95rem;cursor:pointer;font-weight:600;font-family:inherit;">Set password</button>';
    document.body.appendChild(recoveryBox);
    document.getElementById("setPasswordBtn").addEventListener("click", async () => {
      const newPass = document.getElementById("newPassword").value;
      const confirmPass = document.getElementById("confirmPassword").value;
      const errEl = document.getElementById("recoveryError");
      if (newPass.length < 8) { errEl.textContent = "Password must be at least 8 characters."; return; }
      if (newPass !== confirmPass) { errEl.textContent = "Passwords do not match."; return; }
      errEl.textContent = "";
      document.getElementById("setPasswordBtn").textContent = "Saving…";
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) { errEl.textContent = "Error: " + error.message; document.getElementById("setPasswordBtn").textContent = "Set password"; return; }
      recoveryBox.innerHTML = '<h2 style="font-size:1.2rem;font-weight:600;color:#28a745;margin-bottom:8px;">Password updated</h2><p style="color:#6e6e73;margin-bottom:22px;font-size:0.88rem;">Your password has been saved.</p><button onclick="window.location.reload()" style="padding:11px 28px;background:#1d1d1f;color:#fff;border:none;border-radius:8px;font-size:0.95rem;cursor:pointer;font-family:inherit;font-weight:600;">Go to login</button>';
    });
  }
  recoveryBox.style.display = "block";
}

/* ── Login / logout ──────────────────────────────────── */
loginBtn && loginBtn.addEventListener("click", async () => {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  loginBtn.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  loginBtn.textContent = "Sign in";
  if (error) {
    document.getElementById("loginError").textContent = "Sign in failed. Check your email and password.";
    return;
  }
  document.getElementById("loginError").textContent = "";
  showDashboard();
});

logoutBtn && logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  dashboard.style.display = "none";
  loginBox.style.display = "flex";
  // Clear module state so a different admin doesn't see stale data
  currentEvents = [];
  currentGameReport = [];
  currentSummary = {};
  currentRecent = [];
});

refreshBtn && refreshBtn.addEventListener("click", () => loadDashboard());

function showDashboard() {
  loginBox.style.display = "none";
  if (recoveryBox) recoveryBox.style.display = "none";
  dashboard.style.display = "block";
  loadDashboard();
}

async function checkSession() {
  const redirected = await handleAuthRedirect();
  if (redirected) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showDashboard();
  else { loginBox.style.display = "flex"; dashboard.style.display = "none"; }
}

/* ── Data load ───────────────────────────────────────── */
async function loadDashboard() {
  dashStatus.textContent = "Loading…";
  const { data, error } = await supabase.from("game_events").select("*").limit(5000);
  if (error) {
    console.error("Error loading data:", error);
    dashStatus.textContent = "Failed to load. Check connection.";
    return;
  }
  currentEvents = data || [];
  renderDashboard(currentEvents);
  const ts = new Date();
  dashStatus.textContent = "Showing " + currentEvents.length.toLocaleString() + " events · updated " + ts.toLocaleTimeString();
}

/* ── Render ──────────────────────────────────────────── */
function renderDashboard(events) {
  // ── Summary ──
  const views       = events.filter(e => e.event_name === "page_view").length;
  const starts      = events.filter(e => e.event_name === "game_started").length;
  const completions = events.filter(e => e.event_name === "game_completed").length;
  const allUserIds  = new Set(events.map(e => e.anonymous_user_id).filter(Boolean));
  const uniqueUsers = allUserIds.size;
  const completedWithTime = events.filter(e => e.event_name === "game_completed" && Number.isFinite(e.time_spent_seconds));
  const avgTime = completedWithTime.length
    ? Math.round(completedWithTime.reduce((s, e) => s + e.time_spent_seconds, 0) / completedWithTime.length)
    : 0;

  // New vs returning users: a user with 2+ sessions is "returning"
  const sessionsByUser = {};
  events.forEach(e => {
    if (!e.anonymous_user_id) return;
    if (!sessionsByUser[e.anonymous_user_id]) sessionsByUser[e.anonymous_user_id] = new Set();
    if (e.session_id) sessionsByUser[e.anonymous_user_id].add(e.session_id);
  });
  let newUsers = 0, returningUsers = 0;
  Object.values(sessionsByUser).forEach(sessions => {
    if (sessions.size >= 2) returningUsers++; else newUsers++;
  });

  document.getElementById("totalViews").textContent           = views.toLocaleString();
  document.getElementById("totalGameStarts").textContent      = starts.toLocaleString();
  document.getElementById("totalGameCompletions").textContent = completions.toLocaleString();
  document.getElementById("uniqueUsers").textContent          = uniqueUsers.toLocaleString();
  document.getElementById("averageTime").textContent          = avgTime ? (avgTime + "s") : "—";

  // ── Game Report (used by table + export) ──
  currentGameReport = computeGameReport(events);
  renderGameReport(currentGameReport);

  // Most played game (for summary export)
  const mostPlayed = currentGameReport
    .slice()
    .sort((a, b) => b.starts - a.starts)[0];

  currentSummary = {
    totalWebsiteVisits: views,
    uniqueUsers,
    totalGameStarts: starts,
    totalGameCompletions: completions,
    averageGameTime: avgTime ? (avgTime + "s") : "—",
    mostPlayedGame: mostPlayed ? mostPlayed.game : "—",
    newUsers,
    returningUsers
  };

  // ── Recent events (top 20) ──
  currentRecent = [...events]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);
  renderRecentEvents(currentRecent);

  // Game report meta line
  const totalGames = currentGameReport.length;
  document.getElementById("gameReportMeta").textContent =
    totalGames ? totalGames + (totalGames === 1 ? " game" : " games") : "No games yet";
}

function computeGameReport(events) {
  // Track per-game: starts, completions, scores, times, exits, replays
  const games = {};
  // For replay count: count attempts per (user, game). Replays = totalAttempts - distinctUsers.
  const attempts = {}; // game -> { userId -> count of starts }

  events.forEach(e => {
    const g = e.game_name;
    if (!g) return;
    if (!games[g]) games[g] = { game: g, starts: 0, completions: 0, scores: [], times: [] };
    if (e.event_name === "game_started") {
      games[g].starts++;
      if (e.anonymous_user_id) {
        if (!attempts[g]) attempts[g] = {};
        attempts[g][e.anonymous_user_id] = (attempts[g][e.anonymous_user_id] || 0) + 1;
      }
    }
    if (e.event_name === "game_completed") {
      games[g].completions++;
      if (Number.isFinite(e.score)) games[g].scores.push(e.score);
      if (Number.isFinite(e.time_spent_seconds)) games[g].times.push(e.time_spent_seconds);
    }
  });

  return Object.values(games).map(g => {
    const avgScore = g.scores.length
      ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length)
      : null;
    const avgTime = g.times.length
      ? Math.round(g.times.reduce((a, b) => a + b, 0) / g.times.length)
      : null;
    const completionRate = g.starts > 0 ? (g.completions / g.starts) : 0;
    const exits = Math.max(0, g.starts - g.completions);
    let replayCount = 0;
    const perUser = attempts[g.game];
    if (perUser) {
      Object.values(perUser).forEach(n => { if (n > 1) replayCount += (n - 1); });
    }
    return {
      game: g.game,
      starts: g.starts,
      completions: g.completions,
      completionRate,         // 0..1 fraction (we format on render/export)
      avgTime,                // seconds or null
      avgScore,               // number or null
      exits,
      replayCount
    };
  }).sort((a, b) => b.starts - a.starts);
}

function renderGameReport(report) {
  const tbody = document.getElementById("gameReportBody");
  tbody.innerHTML = "";
  if (!report.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No game activity yet.</td></tr>';
    return;
  }
  report.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + escapeHtml(r.game) + "</td>" +
      "<td>" + r.starts + "</td>" +
      "<td>" + r.completions + "</td>" +
      "<td>" + (r.starts > 0 ? (Math.round(r.completionRate * 100) + "%") : "—") + "</td>" +
      "<td>" + (r.avgTime != null ? r.avgTime + "s" : "—") + "</td>" +
      "<td>" + (r.avgScore != null ? r.avgScore : "—") + "</td>" +
      "<td>" + r.exits + "</td>" +
      "<td>" + r.replayCount + "</td>";
    tbody.appendChild(tr);
  });
}

function renderRecentEvents(recent) {
  const tbody = document.getElementById("recentEventsBody");
  tbody.innerHTML = "";
  if (!recent.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No events yet.</td></tr>';
    return;
  }
  recent.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + escapeHtml(new Date(e.created_at).toLocaleString()) + "</td>" +
      "<td>" + escapeHtml(e.event_name || "—") + "</td>" +
      "<td>" + escapeHtml(e.game_name || "—") + "</td>" +
      "<td>" + (Number.isFinite(e.score) ? e.score : "—") + "</td>" +
      "<td>" + (Number.isFinite(e.time_spent_seconds) ? e.time_spent_seconds + "s" : "—") + "</td>" +
      "<td>" + escapeHtml(e.device_type || "—") + "</td>" +
      "<td>" + escapeHtml(e.page_path || "—") + "</td>";
    tbody.appendChild(tr);
  });
}

function escapeHtml(v) {
  if (v == null) return "";
  return String(v).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[ch]));
}

/* ─────────────────────────────────────────────────────
   EXPORTS — SheetJS (.xlsx) with CSV fallback
   ───────────────────────────────────────────────────── */

function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function buildSummaryRows() {
  const s = currentSummary || {};
  return [
    ["Metric", "Value"],
    ["Total Website Visits",   s.totalWebsiteVisits   ?? 0],
    ["Unique Users",           s.uniqueUsers          ?? 0],
    ["Total Game Starts",      s.totalGameStarts      ?? 0],
    ["Total Game Completions", s.totalGameCompletions ?? 0],
    ["Average Game Time",      s.averageGameTime      ?? "—"],
    ["Most Played Game",       s.mostPlayedGame       ?? "—"],
    ["New Users",              s.newUsers             ?? 0],
    ["Returning Users",        s.returningUsers       ?? 0]
  ];
}

function buildGameReportRows() {
  const head = ["Game", "Starts", "Completions", "Completion Rate", "Average Time", "Average Score", "Exits", "Replay Count"];
  const rows = (currentGameReport || []).map(r => [
    r.game,
    r.starts,
    r.completions,
    r.starts > 0 ? (Math.round(r.completionRate * 1000) / 10).toFixed(1) + "%" : "—",
    r.avgTime != null ? r.avgTime + "s" : "—",
    r.avgScore != null ? r.avgScore : "—",
    r.exits,
    r.replayCount
  ]);
  return [head, ...rows];
}

function buildRecentEventRows() {
  const head = ["Time", "Event", "Game", "Score", "Time Spent", "Device", "Page"];
  const rows = (currentRecent || []).map(e => [
    new Date(e.created_at).toLocaleString(),
    e.event_name || "—",
    e.game_name || "—",
    Number.isFinite(e.score) ? e.score : "—",
    Number.isFinite(e.time_spent_seconds) ? e.time_spent_seconds + "s" : "—",
    e.device_type || "—",
    e.page_path || "—"
  ]);
  return [head, ...rows];
}

function buildRawEventRows() {
  const head = [
    "ID", "Created At", "Event Name", "Game Name", "Page Path",
    "Anonymous User ID", "Session ID", "Score", "Time Spent Seconds",
    "Device Type", "Referrer"
  ];
  const rows = (currentEvents || []).map(e => [
    e.id != null ? e.id : "",
    e.created_at || "",
    e.event_name || "",
    e.game_name || "",
    e.page_path || "",
    e.anonymous_user_id || "",
    e.session_id || "",
    Number.isFinite(e.score) ? e.score : "",
    Number.isFinite(e.time_spent_seconds) ? e.time_spent_seconds : "",
    e.device_type || "",
    e.referrer || ""
  ]);
  return [head, ...rows];
}

/* Build a workbook (or CSV fallback) and trigger a download.
   `sheets` is an array of { name, rows: [[...header], [...row1], ...] } objects. */
function downloadWorkbook(filename, sheets) {
  if (!Array.isArray(sheets) || sheets.length === 0) return;

  // Prefer SheetJS if it's available, otherwise CSV fallback.
  if (typeof window.XLSX !== "undefined") {
    try {
      const wb = window.XLSX.utils.book_new();
      sheets.forEach(s => {
        const ws = window.XLSX.utils.aoa_to_sheet(s.rows);
        window.XLSX.utils.book_append_sheet(wb, ws, (s.name || "Sheet").slice(0, 31));
      });
      window.XLSX.writeFile(wb, filename + ".xlsx");
      return;
    } catch (err) {
      console.warn("XLSX export failed, falling back to CSV:", err);
    }
  }

  // CSV fallback
  if (sheets.length === 1) {
    triggerCsvDownload(filename + ".csv", sheets[0].rows);
  } else {
    // Multi-sheet -> one CSV per sheet (browsers will download sequentially)
    sheets.forEach((s, i) => {
      const safeName = (s.name || ("Sheet" + (i + 1))).replace(/[^\w-]+/g, "_");
      triggerCsvDownload(filename + "_" + safeName + ".csv", s.rows);
    });
  }
}

function triggerCsvDownload(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportGameReport() {
  const today = getTodayString();
  downloadWorkbook(
    "Gulsabi_Game_Report_" + today,
    [{ name: "Game Report", rows: buildGameReportRows() }]
  );
}

function exportRecentEvents() {
  const today = getTodayString();
  downloadWorkbook(
    "Gulsabi_Recent_Events_" + today,
    [{ name: "Recent Events", rows: buildRecentEventRows() }]
  );
}

function exportFullAnalytics() {
  const today = getTodayString();
  downloadWorkbook(
    "Gulsabi_Full_Analytics_" + today,
    [
      { name: "Summary",       rows: buildSummaryRows() },
      { name: "Game Report",   rows: buildGameReportRows() },
      { name: "Recent Events", rows: buildRecentEventRows() },
      { name: "Raw Events",    rows: buildRawEventRows() }
    ]
  );
}

// Wire up export buttons (these are inside the dashboard, only reachable after login).
document.getElementById("exportGameBtn")  ?.addEventListener("click", exportGameReport);
document.getElementById("exportEventsBtn")?.addEventListener("click", exportRecentEvents);
document.getElementById("exportFullBtn")  ?.addEventListener("click", exportFullAnalytics);

checkSession();
