// ─────────────────────────────────────────────────────────────────
// Gulsabi Admin Dashboard
// Privacy-safe: uses the public SUPABASE_ANON_KEY only. Service-role
// keys are never referenced or shipped to the client.
// ─────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0G9K_r3z-fbMx_hkk3IAPg_HHAIM9pO";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ── Game ID → Display Name map ────────────────────────────────
// Ensures charts and cards always show the friendly game name
// even if game_name is missing from a DB row.
const GAME_NAMES = {
  game1: "Sky Adventure",
  game2: "Color Cannon",
  game3: "Odd One Out",
  game4: "Memory Match",
  game5: "Quiz Time"
};
function gameDisplayName(gameId, gameName) {
  if (gameName && gameName !== gameId) return gameName;
  return GAME_NAMES[gameId] || gameId;
}


/* ── DOM refs ───────────────────────────────────────────────── */
const loginBox  = document.getElementById("loginBox");
const app       = document.getElementById("app");
const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const dateRange = document.getElementById("dateRange");
let recoveryBox = null;

/* ── Module-level state ─────────────────────────────────────── */
let rawAnonUsers   = [];
let rawSessions    = [];
let rawGameSessions = [];
let rawEvents      = [];
let rawPwaInstalls = [];
let rawErrors      = [];

// Derived state for exports / quick re-renders
let dateFilter = "7";
let computedSummary = {};
let computedGameReport = [];

// Charts cache (so we can destroy/recreate on re-render)
const _charts = {};
function destroyChart(key) {
  if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
}

/* ── Auth recovery (deep link from password-reset email) ────── */
async function handleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.substring(1));
  if (params.get("type") === "recovery" && params.get("access_token")) {
    await supabase.auth.setSession({
      access_token:  params.get("access_token"),
      refresh_token: params.get("refresh_token") || ""
    });
    history.replaceState(null, "", window.location.pathname);
    showResetPasswordBox();
    return true;
  }
  return false;
}

function showResetPasswordBox() {
  loginBox.style.display = "none";
  app.style.display = "none";
  if (!recoveryBox) {
    recoveryBox = document.createElement("div");
    recoveryBox.style.cssText = "max-width:380px;margin:80px auto;background:#fff;padding:36px;border-radius:18px;box-shadow:0 4px 14px rgba(0,0,0,0.06);border:1px solid rgba(0,0,0,0.08);text-align:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif;";
    recoveryBox.innerHTML = '<h2 style="font-size:1.2rem;font-weight:600;letter-spacing:-0.01em;margin-bottom:6px;color:#1d1d1f;">Set new password</h2><p style="color:#6e6e73;margin-bottom:22px;font-size:0.88rem;">Enter your new password below.</p><input id="newPassword" type="password" placeholder="New password (min 8 chars)" style="width:100%;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;font-size:0.95rem;box-sizing:border-box;margin-bottom:10px;font-family:inherit;" /><input id="confirmPassword" type="password" placeholder="Confirm new password" style="width:100%;padding:11px 14px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;font-size:0.95rem;box-sizing:border-box;margin-bottom:14px;font-family:inherit;" /><div id="recoveryError" style="color:#d70015;font-size:0.82rem;margin-bottom:12px;min-height:1.1em;"></div><button id="setPasswordBtn" style="width:100%;padding:11px;background:#1d1d1f;color:#fff;border:none;border-radius:8px;font-size:0.95rem;cursor:pointer;font-weight:600;font-family:inherit;">Set password</button>';
    document.body.appendChild(recoveryBox);
    document.getElementById("setPasswordBtn").addEventListener("click", async () => {
      const a = document.getElementById("newPassword").value;
      const b = document.getElementById("confirmPassword").value;
      const err = document.getElementById("recoveryError");
      if (a.length < 8) { err.textContent = "Password must be at least 8 characters."; return; }
      if (a !== b)      { err.textContent = "Passwords do not match."; return; }
      err.textContent = "";
      const { error } = await supabase.auth.updateUser({ password: a });
      if (error) { err.textContent = "Error: " + error.message; return; }
      recoveryBox.innerHTML = '<h2 style="font-size:1.2rem;font-weight:600;color:#28a745;margin-bottom:8px;">Password updated</h2><button onclick="window.location.reload()" style="padding:11px 28px;background:#1d1d1f;color:#fff;border:none;border-radius:8px;font-size:0.95rem;cursor:pointer;font-family:inherit;font-weight:600;">Go to login</button>';
    });
  }
  recoveryBox.style.display = "block";
}

/* ── Login / logout ─────────────────────────────────────────── */
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const pwd   = document.getElementById("password").value;
  loginBtn.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
  loginBtn.textContent = "Sign in";
  if (error) {
    document.getElementById("loginError").textContent = "Sign in failed. Check email and password.";
    return;
  }
  document.getElementById("loginError").textContent = "";
  showApp();
});
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  loginBox.style.display = "flex";
  app.style.display = "none";
  rawAnonUsers = rawSessions = rawGameSessions = rawEvents = rawPwaInstalls = rawErrors = [];
});
refreshBtn.addEventListener("click", () => loadAll());
dateRange.addEventListener("change", () => { dateFilter = dateRange.value; renderAll(); });

function showApp() {
  loginBox.style.display = "none";
  if (recoveryBox) recoveryBox.style.display = "none";
  app.style.display = "block";
  loadAll();
}

async function checkSession() {
  if (await handleAuthRedirect()) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp();
  else { loginBox.style.display = "flex"; app.style.display = "none"; }
}

/* ── Sidebar nav ────────────────────────────────────────────── */
const navItems = document.querySelectorAll(".nav-item");
const pages    = document.querySelectorAll("section.page");
const pageTitle = document.getElementById("pageTitle");
const pageSub   = document.getElementById("pageSub");
const PAGE_INFO = {
  overview:   { title: "Overview",            sub: "Top-line metrics across the brand" },
  games:      { title: "Games Analytics",     sub: "Per-game performance and comparison" },
  users:      { title: "Users & Retention",   sub: "New vs returning + cohort retention" },
  installs:   { title: "App Installs",        sub: "PWA install funnel" },
  sources:    { title: "Traffic Sources",     sub: "Where users come from" },
  scores:     { title: "Game Scores",         sub: "Score distribution & high scores" },
  engagement: { title: "Engagement Time",     sub: "Session and play durations" },
  errors:     { title: "Technical Errors",    sub: "Frontend errors by game/browser" },
  exports:    { title: "Export Reports",      sub: "Download analytics data" },
  privacy:    { title: "Privacy & Consent",   sub: "What we collect, what we don’t" }
};
navItems.forEach(n => n.addEventListener("click", () => switchPage(n.dataset.page)));
function switchPage(key) {
  navItems.forEach(n => n.classList.toggle("active", n.dataset.page === key));
  pages.forEach(p => p.classList.toggle("active", p.dataset.page === key));
  const info = PAGE_INFO[key] || {};
  pageTitle.textContent = info.title || "";
  pageSub.textContent   = info.sub   || "";
  renderPage(key); // (re)draw page-specific charts
}

/* ── Data load (parallel) ──────────────────────────────────── */
async function loadAll() {
  pageSub.textContent = "Loading…";
  try {
    const [u, s, gs, e, p, er] = await Promise.all([
      supabase.from("anonymous_users").select("*").limit(20000),
      supabase.from("sessions").select("*").limit(20000),
      supabase.from("game_sessions").select("*").limit(20000),
      supabase.from("game_events").select("*").order("event_time", { ascending: false }).limit(20000),
      supabase.from("pwa_installs").select("*").limit(10000),
      supabase.from("errors").select("*").order("created_at", { ascending: false }).limit(2000)
    ]);
    rawAnonUsers    = (u.data  || []);
    rawSessions     = (s.data  || []);
    rawGameSessions = (gs.data || []);
    rawEvents       = (e.data  || []);
    rawPwaInstalls  = (p.data  || []);
    rawErrors       = (er.data || []);
  } catch (err) {
    console.warn("Load error", err);
  }
  renderAll();
}

/* ── Date filtering ─────────────────────────────────────────── */
function cutoffFromFilter(value) {
  const now = new Date();
  if (value === "today") {
    const d = new Date(now); d.setHours(0,0,0,0); return d;
  }
  if (value === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const n = parseInt(value, 10);
  if (Number.isFinite(n) && n > 0) {
    return new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  }
  return null; // 'all'
}

function inRange(row, cutoff) {
  if (!cutoff) return true;
  const ts = row.event_time || row.created_at || row.started_at || row.first_seen_at;
  if (!ts) return true;
  return new Date(ts) >= cutoff;
}

function filtered() {
  const c = cutoffFromFilter(dateFilter);
  return {
    users:    rawAnonUsers   .filter(r => inRange(r, c)),
    sessions: rawSessions    .filter(r => inRange(r, c)),
    gs:       rawGameSessions.filter(r => inRange(r, c)),
    events:   rawEvents      .filter(r => inRange(r, c)),
    pwa:      rawPwaInstalls .filter(r => inRange(r, c)),
    errors:   rawErrors      .filter(r => inRange(r, c))
  };
}

/* ── Compute / render ──────────────────────────────────────── */
function renderAll() {
  computeSummary();
  computeGameReport();
  // Render the currently visible page
  const active = document.querySelector(".nav-item.active");
  if (active) renderPage(active.dataset.page);
  // Always refresh overview cards (cheap & ensures sub-line is current)
  paintOverviewCards();
  paintOverviewTable();
  paintHeader();
}

function paintHeader() {
  const c = cutoffFromFilter(dateFilter);
  const total = filtered().events.length;
  pageSub.textContent = (c ? "Since " + c.toLocaleDateString() : "All time")
                     + " · " + total.toLocaleString() + " events";
}

function computeSummary() {
  const f = filtered();
  const today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  const usersToday = rawAnonUsers.filter(u => u.first_seen_at && new Date(u.first_seen_at) >= today);
  const returningToday = rawAnonUsers.filter(u => u.is_returning_user && u.last_seen_at && new Date(u.last_seen_at) >= today);
  const playsToday = rawGameSessions.filter(s => s.started_at && new Date(s.started_at) >= today);

  const completedSessions = f.gs.filter(s => Number.isFinite(s.duration_seconds) && s.duration_seconds > 0);
  const avgDur = completedSessions.length
    ? Math.round(completedSessions.reduce((a,b)=>a+b.duration_seconds,0) / completedSessions.length)
    : 0;
  const totalMins = Math.round(f.gs.reduce((a,b)=>a+(b.duration_seconds||0),0) / 60);

  // Most played game
  const playsByGame = {};
  f.gs.forEach(s => { if (!s.game_id) return; playsByGame[s.game_id] = (playsByGame[s.game_id]||0)+1; });
  const mostPlayed = Object.entries(playsByGame).sort((a,b)=>b[1]-a[1])[0];

  // Best retention game: highest repeat-play rate
  let bestRet = null, bestRetRate = -1;
  const usersPerGame = {};
  f.gs.forEach(s => {
    if (!s.game_id || !s.anonymous_user_id) return;
    usersPerGame[s.game_id] = usersPerGame[s.game_id] || new Map();
    const m = usersPerGame[s.game_id];
    m.set(s.anonymous_user_id, (m.get(s.anonymous_user_id) || 0) + 1);
  });
  for (const [gid, m] of Object.entries(usersPerGame)) {
    if (m.size < 1) continue;
    let repeats = 0;
    m.forEach(n => { if (n > 1) repeats++; });
    const rate = repeats / m.size;
    if (rate > bestRetRate) { bestRetRate = rate; bestRet = gid; }
  }

  // PWA
  const installsShown     = f.pwa.filter(p => p.install_status === "shown").length;
  const installsInstalled = f.pwa.filter(p => p.install_status === "installed").length;
  const installsConv      = installsShown > 0 ? installsInstalled / installsShown : 0;

  // Bounce: sessions with no game_start event
  const sessionsWithGame = new Set(f.gs.map(s => s.session_id));
  const bounce = f.sessions.filter(s => !sessionsWithGame.has(s.session_id)).length;

  computedSummary = {
    totalUsers:      f.users.length,
    newToday:        usersToday.length,
    returningToday:  returningToday.length,
    totalSessions:   f.gs.length,
    playsToday:      playsToday.length,
    avgPlay:         avgDur ? formatDuration(avgDur) : "—",
    avgPlaySeconds:  avgDur,
    totalMins,
    mostPlayed:      mostPlayed ? gameDisplayName(mostPlayed[0], null) : "—",
    mostPlayedCount: mostPlayed ? mostPlayed[1] : 0,
    bestRet:         bestRet ? gameDisplayName(bestRet, null) : "—",
    bestRetRate,
    pwaInstalls:     installsInstalled,
    pwaConv:         installsConv,
    bounce,
    pageViews:       f.events.filter(e => e.event_name === "page_view").length
  };
}

function paintOverviewCards() {
  const s = computedSummary;
  set("ovUsers",         s.totalUsers);
  set("ovNewToday",      s.newToday);
  set("ovReturnToday",   s.returningToday);
  set("ovTotalSessions", s.totalSessions);
  set("ovPlaysToday",    s.playsToday);
  set("ovAvgPlay",       s.avgPlay);
  set("ovTotalMins",     s.totalMins);
  set("ovMostPlayed",    s.mostPlayed);
  set("ovBestRet",       s.bestRet);
  set("ovPwaInstalls",   s.pwaInstalls);
  set("ovPwaConv",       formatPercent(s.pwaConv));
  set("ovBounce",        s.bounce);
}
function set(id, v) { const el = document.getElementById(id); if (el) el.textContent = (v == null ? "—" : String(v)); }

function paintOverviewTable() {
  const tbody = document.getElementById("ovTopGames");
  tbody.innerHTML = "";
  const rows = computedGameReport
    .slice()
    .sort((a, b) => b.uniqueUsers - a.uniqueUsers)
    .slice(0, 5);
  if (!rows.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No game activity yet.</td></tr>'; return; }
  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + esc(r.game) + "</td>" +
      "<td>" + r.uniqueUsers + "</td>" +
      "<td>" + r.plays + "</td>" +
      "<td>" + (r.avgTime != null ? r.avgTime + "s" : "—") + "</td>" +
      "<td>" + formatPercent(r.completionRate) + "</td>";
    tbody.appendChild(tr);
  });
}

function computeGameReport() {
  const f = filtered();
  // Group by game_id
  const games = {};
  f.gs.forEach(s => {
    const g = s.game_id || "unknown";
    if (!games[g]) games[g] = {
      game: gameDisplayName(g, s.game_name),
      game_id: g,
      uniqueUsers: new Set(),
      plays: 0, completions: 0, exits: 0, retries: 0, failed: 0,
      scores: [], times: [], levels: [],
      attempts: new Map() // userId -> count
    };
    games[g].plays++;
    if (s.anonymous_user_id) {
      games[g].uniqueUsers.add(s.anonymous_user_id);
      games[g].attempts.set(s.anonymous_user_id, (games[g].attempts.get(s.anonymous_user_id)||0)+1);
    }
    if (s.completed) games[g].completions++;
    if (s.exited)    games[g].exits++;
    if (s.failed)    games[g].failed++;
    if (Number.isFinite(s.score) && s.score > 0) games[g].scores.push(s.score);
    if (Number.isFinite(s.duration_seconds) && s.duration_seconds > 0) games[g].times.push(s.duration_seconds);
    if (Number.isFinite(s.highest_level)) games[g].levels.push(s.highest_level);
  });
  // Retry events from game_events
  f.events.forEach(e => {
    if (e.event_name !== "retry_game" || !e.game_id) return;
    if (games[e.game_id]) games[e.game_id].retries++;
  });

  computedGameReport = Object.values(games).map(g => {
    const avgScore = g.scores.length ? Math.round(g.scores.reduce((a,b)=>a+b,0)/g.scores.length) : null;
    const high     = g.scores.length ? Math.max(...g.scores) : null;
    const avgTime  = g.times .length ? Math.round(g.times .reduce((a,b)=>a+b,0)/g.times .length) : null;
    const totalMins = Math.round(g.times.reduce((a,b)=>a+b,0) / 60);
    const completionRate = g.plays > 0 ? g.completions / g.plays : 0;
    let repeatUsers = 0, repeatPlays = 0;
    g.attempts.forEach(n => { if (n > 1) { repeatUsers++; repeatPlays += (n - 1); } });
    const retryRate = g.plays > 0 ? g.retries / g.plays : 0;
    const repeatRate = g.uniqueUsers.size > 0 ? repeatUsers / g.uniqueUsers.size : 0;
    return {
      game:          g.game,
      game_id:       g.game_id,
      uniqueUsers:   g.uniqueUsers.size,
      plays:         g.plays,
      starts:        g.plays,
      completions:   g.completions,
      exits:         g.exits,
      failed:        g.failed,
      avgScore, highScore: high,
      avgTime, totalMins,
      completionRate,
      retryRate,
      repeatPlays,
      repeatRate,
      highestLevel:  g.levels.length ? Math.max(...g.levels) : null
    };
  }).sort((a,b)=>b.plays-a.plays);
}

/* ── Per-page renderers ────────────────────────────────────── */
function renderPage(key) {
  if (key === "overview")   renderOverview();
  if (key === "games")      renderGames();
  if (key === "users")      renderUsers();
  if (key === "installs")   renderInstalls();
  if (key === "sources")    renderSources();
  if (key === "scores")     renderScores();
  if (key === "engagement") renderEngagement();
  if (key === "errors")     renderErrors();
}

function renderOverview() {
  if (typeof Chart === "undefined") return;
  // Daily active users line
  const f = filtered();
  const byDay = bucketByDay(f.events.filter(e => e.event_name === "page_view"), "event_time");
  const labels = Object.keys(byDay);
  destroyChart("dau");
  _charts.dau = new Chart(document.getElementById("chartDAU"), {
    type: "line",
    data: { labels, datasets: [{ label: "Visits", data: labels.map(k => byDay[k].length),
      borderColor: "#1d1d1f", backgroundColor: "rgba(29,29,31,0.08)", fill: true, tension: 0.3, pointRadius: 2 }] },
    options: chartOpts()
  });

  // Game distribution pie
  destroyChart("pie");
  const labels2 = computedGameReport.map(g => g.game);
  const data2   = computedGameReport.map(g => g.plays);
  _charts.pie = new Chart(document.getElementById("chartPie"), {
    type: "doughnut",
    data: { labels: labels2, datasets: [{ data: data2,
      backgroundColor: ["#FF4F4F","#00A3E0","#FFD600","#34c759","#9c27b0","#ff9800"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } } } }
  });

  // New vs returning
  destroyChart("nvr");
  const newU = filtered().users.filter(u => !u.is_returning_user).length;
  const retU = filtered().users.filter(u =>  u.is_returning_user).length;
  _charts.nvr = new Chart(document.getElementById("chartNvR"), {
    type: "bar",
    data: { labels: ["New", "Returning"], datasets: [{ data: [newU, retU],
      backgroundColor: ["#00A3E0","#FF4F4F"], borderRadius: 6 }] },
    options: chartOpts({ legend: false })
  });
}

function renderGames() {
  if (typeof Chart === "undefined") return;
  destroyChart("minsByGame");
  _charts.minsByGame = new Chart(document.getElementById("chartMinsByGame"), {
    type: "bar",
    data: {
      labels: computedGameReport.map(g => g.game),
      datasets: [{ label: "Total minutes", data: computedGameReport.map(g => g.totalMins),
        backgroundColor: "#FFD600", borderRadius: 6 }]
    },
    options: chartOpts({ legend: false })
  });

  destroyChart("funnel");
  _charts.funnel = new Chart(document.getElementById("chartFunnel"), {
    type: "bar",
    data: {
      labels: computedGameReport.map(g => g.game),
      datasets: [
        { label: "Starts",       data: computedGameReport.map(g=>g.starts),      backgroundColor: "#00A3E0", borderRadius: 4 },
        { label: "Completions",  data: computedGameReport.map(g=>g.completions), backgroundColor: "#34c759", borderRadius: 4 },
        { label: "Exits",        data: computedGameReport.map(g=>g.exits),       backgroundColor: "#FF4F4F", borderRadius: 4 }
      ]
    },
    options: chartOpts()
  });

  // Comparison table
  const tbody = document.getElementById("gamesTable");
  tbody.innerHTML = "";
  if (!computedGameReport.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="11">No game activity yet.</td></tr>';
  } else {
    computedGameReport.forEach(g => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(g.game) + "</td>" +
        "<td>" + g.uniqueUsers + "</td>" +
        "<td>" + g.plays + "</td>" +
        "<td>" + (g.avgTime != null ? g.avgTime + "s" : "—") + "</td>" +
        "<td>" + g.totalMins + "</td>" +
        "<td>" + formatPercent(g.completionRate) + "</td>" +
        "<td>" + (g.avgScore  != null ? g.avgScore  : "—") + "</td>" +
        "<td>" + (g.highScore != null ? g.highScore : "—") + "</td>" +
        "<td>" + g.repeatPlays + "</td>" +
        "<td>" + formatPercent(g.retryRate) + "</td>" +
        "<td>" + g.exits + "</td>";
      tbody.appendChild(tr);
    });
  }
  document.getElementById("gamesMeta").textContent = computedGameReport.length
    ? computedGameReport.length + " games"
    : "No games yet";
}

function renderUsers() {
  // Retention: returning users / users seen on baseline day
  const d1 = retentionPct(1);
  const d7 = retentionPct(7);
  const d30 = retentionPct(30);
  set("retD1",  formatPercent(d1));
  set("retD7",  formatPercent(d7));
  set("retD30", formatPercent(d30));

  const f = filtered();
  const totalUsers = f.users.length;
  const repeatUsers = f.users.filter(u => u.is_returning_user).length;
  set("retRepeat", formatPercent(totalUsers > 0 ? repeatUsers / totalUsers : 0));

  const sessByUser = {};
  f.sessions.forEach(s => { if (!s.anonymous_user_id) return; sessByUser[s.anonymous_user_id] = (sessByUser[s.anonymous_user_id]||0)+1; });
  const avgSpu = Object.values(sessByUser).length
    ? Math.round((Object.values(sessByUser).reduce((a,b)=>a+b,0) / Object.values(sessByUser).length) * 100) / 100
    : 0;
  set("retSpU", avgSpu);

  if (typeof Chart === "undefined") return;
  destroyChart("usersNvR");
  const newU = f.users.filter(u => !u.is_returning_user).length;
  const retU = f.users.filter(u =>  u.is_returning_user).length;
  _charts.usersNvR = new Chart(document.getElementById("chartUsersNvR"), {
    type: "doughnut",
    data: { labels: ["New", "Returning"], datasets: [{ data: [newU, retU], backgroundColor: ["#00A3E0","#FF4F4F"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
  });

  destroyChart("retTrend");
  // Simple: count first_seen_at by day for last 14 days
  const days = 14;
  const today = new Date(); today.setHours(0,0,0,0);
  const labels = [], buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i*86400000);
    labels.push(d.toISOString().slice(5,10));
    const next = new Date(d.getTime() + 86400000);
    buckets.push(rawAnonUsers.filter(u => u.first_seen_at && new Date(u.first_seen_at) >= d && new Date(u.first_seen_at) < next).length);
  }
  _charts.retTrend = new Chart(document.getElementById("chartRetTrend"), {
    type: "line",
    data: { labels, datasets: [{ label: "New users", data: buckets, borderColor: "#1d1d1f", backgroundColor: "rgba(29,29,31,0.08)", fill: true, tension: 0.3 }] },
    options: chartOpts()
  });
}

function retentionPct(nDays) {
  // % of users first seen >= nDays ago who returned (last_seen_at - first_seen_at >= 1 day)
  const cutoff = new Date(Date.now() - nDays * 86400000);
  const cohort = rawAnonUsers.filter(u => u.first_seen_at && new Date(u.first_seen_at) <= cutoff);
  if (!cohort.length) return 0;
  const returned = cohort.filter(u => u.last_seen_at && (new Date(u.last_seen_at) - new Date(u.first_seen_at)) >= nDays * 86400000);
  return returned.length / cohort.length;
}

function renderInstalls() {
  const f = filtered();
  const shown      = f.pwa.filter(p => p.install_status === "shown").length;
  const accepted   = f.pwa.filter(p => p.install_status === "accepted").length;
  const dismissed  = f.pwa.filter(p => p.install_status === "dismissed").length;
  const installed  = f.pwa.filter(p => p.install_status === "installed").length;
  set("instShown",     shown);
  set("instAccepted",  accepted);
  set("instDismissed", dismissed);
  set("instInstalled", installed);
  set("instConv",      formatPercent(shown > 0 ? installed / shown : 0));

  if (typeof Chart === "undefined") return;
  destroyChart("instFunnel");
  _charts.instFunnel = new Chart(document.getElementById("chartInstFunnel"), {
    type: "bar",
    data: { labels: ["Shown","Accepted","Dismissed","Installed"],
      datasets: [{ data: [shown, accepted, dismissed, installed],
        backgroundColor: ["#00A3E0","#FFD600","#FF4F4F","#34c759"], borderRadius: 6 }] },
    options: chartOpts({ legend: false })
  });
}

function renderSources() {
  const f = filtered();
  const bySource = {};
  f.users.forEach(u => {
    const src = u.utm_source || u.source || "direct";
    if (!bySource[src]) bySource[src] = { users: 0, returning: 0 };
    bySource[src].users++;
    if (u.is_returning_user) bySource[src].returning++;
  });
  // Plays + avg time per source via game_sessions joined to users
  const userBySrc = {};
  f.users.forEach(u => { userBySrc[u.anonymous_user_id] = u.utm_source || u.source || "direct"; });
  const playStats = {};
  f.gs.forEach(s => {
    const src = userBySrc[s.anonymous_user_id] || "direct";
    if (!playStats[src]) playStats[src] = { plays: 0, totalDur: 0, durCount: 0 };
    playStats[src].plays++;
    if (Number.isFinite(s.duration_seconds) && s.duration_seconds > 0) {
      playStats[src].totalDur += s.duration_seconds;
      playStats[src].durCount += 1;
    }
  });

  const tbody = document.getElementById("sourcesTable");
  tbody.innerHTML = "";
  const sources = Object.keys(bySource);
  if (!sources.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No source data yet.</td></tr>'; return; }
  sources.sort((a,b)=>bySource[b].users - bySource[a].users).forEach(src => {
    const u = bySource[src]; const p = playStats[src] || { plays: 0, totalDur: 0, durCount: 0 };
    const avg = p.durCount ? Math.round(p.totalDur / p.durCount) : null;
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>" + esc(src) + "</td><td>" + u.users + "</td><td>" + u.returning + "</td><td>" + p.plays + "</td><td>" + (avg != null ? avg + "s" : "—") + "</td>";
    tbody.appendChild(tr);
  });

  if (typeof Chart === "undefined") return;
  destroyChart("srcUsers");
  _charts.srcUsers = new Chart(document.getElementById("chartSrcUsers"), {
    type: "doughnut",
    data: { labels: sources, datasets: [{ data: sources.map(s => bySource[s].users),
      backgroundColor: ["#FF4F4F","#00A3E0","#FFD600","#34c759","#9c27b0","#ff9800","#607d8b"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
  });

  destroyChart("device");
  const dev = {};
  f.users.forEach(u => { const d = u.device_type || "unknown"; dev[d] = (dev[d]||0)+1; });
  _charts.device = new Chart(document.getElementById("chartDevice"), {
    type: "doughnut",
    data: { labels: Object.keys(dev), datasets: [{ data: Object.values(dev),
      backgroundColor: ["#1d1d1f","#FFD600","#00A3E0","#FF4F4F"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
  });
}

function renderScores() {
  // Table
  const tbody = document.getElementById("scoresTable");
  tbody.innerHTML = "";
  const f = filtered();
  const byGame = {};
  f.gs.forEach(s => {
    if (!Number.isFinite(s.score) || s.score <= 0) return;
    const g = gameDisplayName(s.game_id || "unknown", s.game_name);
    if (!byGame[g]) byGame[g] = [];
    byGame[g].push(s.score);
  });
  const labels = Object.keys(byGame);
  if (!labels.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No score data yet.</td></tr>';
  } else {
    labels.forEach(g => {
      const a = byGame[g].slice().sort((x,y)=>x-y);
      const median = a[Math.floor(a.length/2)];
      const avg = Math.round(a.reduce((x,y)=>x+y,0)/a.length);
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + esc(g) + "</td><td>" + a.length + "</td><td>" + avg + "</td><td>" + median + "</td><td>" + Math.max.apply(null, a) + "</td>";
      tbody.appendChild(tr);
    });
  }

  if (typeof Chart === "undefined") return;
  destroyChart("scores");
  _charts.scores = new Chart(document.getElementById("chartScores"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Average",  data: labels.map(g => Math.round(byGame[g].reduce((a,b)=>a+b,0)/byGame[g].length)), backgroundColor: "#00A3E0", borderRadius: 6 },
        { label: "Highest",  data: labels.map(g => Math.max.apply(null, byGame[g])),                              backgroundColor: "#FFD600", borderRadius: 6 }
      ]
    },
    options: chartOpts()
  });
}

function renderEngagement() {
  const f = filtered();
  const sessDurs = f.sessions.filter(s => Number.isFinite(s.session_duration_seconds) && s.session_duration_seconds > 0)
                             .map(s => s.session_duration_seconds);
  const avgSess = sessDurs.length ? Math.round(sessDurs.reduce((a,b)=>a+b,0)/sessDurs.length) : 0;

  const gameDurs = f.gs.filter(s => Number.isFinite(s.duration_seconds) && s.duration_seconds > 0).map(s => s.duration_seconds);
  const avgGame  = gameDurs.length ? Math.round(gameDurs.reduce((a,b)=>a+b,0)/gameDurs.length) : 0;

  const totalMins = Math.round(gameDurs.reduce((a,b)=>a+b,0)/60);

  set("engAvgSess",   formatDuration(avgSess));
  set("engAvgGame",   formatDuration(avgGame));
  set("engTotalMins", totalMins);

  if (typeof Chart === "undefined") return;
  destroyChart("engTime");
  _charts.engTime = new Chart(document.getElementById("chartEngTime"), {
    type: "bar",
    data: {
      labels: computedGameReport.map(g => g.game),
      datasets: [{ label: "Avg seconds", data: computedGameReport.map(g => g.avgTime || 0),
        backgroundColor: "#34c759", borderRadius: 6 }]
    },
    options: chartOpts({ legend: false })
  });
}

function renderErrors() {
  const f = filtered();
  const tbody = document.getElementById("errorsTable");
  tbody.innerHTML = "";
  if (!f.errors.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No errors recorded.</td></tr>';
    return;
  }
  f.errors.slice(0, 50).forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" + esc(new Date(e.created_at).toLocaleString()) + "</td>" +
      "<td>" + esc(e.game_id ? gameDisplayName(e.game_id, null) : "—") + "</td>" +
      "<td>" + esc(e.error_type || "—") + "</td>" +
      "<td>" + esc((e.error_message || "").slice(0,120)) + "</td>" +
      "<td>" + esc(e.browser || "—") + "</td>" +
      "<td>" + esc(e.device_type || "—") + "</td>" +
      "<td>" + esc(e.page_url || "—") + "</td>";
    tbody.appendChild(tr);
  });
}

/* ── Helpers ───────────────────────────────────────────────── */
function bucketByDay(rows, dateField) {
  const buckets = {};
  rows.forEach(r => {
    const ts = r[dateField] || r.created_at;
    if (!ts) return;
    const k = new Date(ts).toISOString().slice(0,10);
    (buckets[k] = buckets[k] || []).push(r);
  });
  // Ensure chronological order
  const sorted = Object.keys(buckets).sort();
  const out = {};
  sorted.forEach(k => { out[k] = buckets[k]; });
  return out;
}
function chartOpts(opts = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: opts.legend === false ? { display: false } : { labels: { font: { size: 11 } } } },
    scales: { x: { ticks: { font: { size: 10 } }, grid: { display: false } },
              y: { ticks: { font: { size: 10 } }, grid: { color: "rgba(0,0,0,0.05)" }, beginAtZero: true } }
  };
}
function formatDuration(secs) {
  if (!secs && secs !== 0) return "—";
  if (secs < 60) return secs + "s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m + "m " + s + "s";
}
function formatPercent(p) {
  if (p == null || !Number.isFinite(p)) return "—";
  return (Math.round(p * 1000) / 10).toFixed(1) + "%";
}
function esc(v) {
  if (v == null) return "";
  return String(v).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[ch]));
}

/* ─────────────────────────────────────────────────────────────
   EXPORTS — Excel (SheetJS) + CSV fallback + PDF (jsPDF)
   ───────────────────────────────────────────────────────────── */

function getTodayString() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function buildSummaryRows() {
  const s = computedSummary || {};
  return [
    ["Metric", "Value"],
    ["Total Website Visits", s.pageViews || 0],
    ["Unique Users",         s.totalUsers || 0],
    ["Total Game Starts",    s.totalSessions || 0],
    ["Games Played Today",   s.playsToday || 0],
    ["Average Game Time",    s.avgPlay || "—"],
    ["Total Play Minutes",   s.totalMins || 0],
    ["Most Played Game",     s.mostPlayed || "—"],
    ["Best Retention Game",  s.bestRet || "—"],
    ["New Users Today",      s.newToday || 0],
    ["Returning Users Today",s.returningToday || 0],
    ["PWA Installs",         s.pwaInstalls || 0],
    ["Install Conversion",   formatPercent(s.pwaConv)],
    ["Bounce Users",         s.bounce || 0]
  ];
}
function buildGameReportRows() {
  const head = ["Game","Unique Users","Plays","Avg Time","Total Mins","Completion %","Avg Score","High Score","Repeat Plays","Retry Rate","Exits"];
  const rows = computedGameReport.map(g => [
    g.game, g.uniqueUsers, g.plays,
    g.avgTime != null ? g.avgTime + "s" : "—",
    g.totalMins,
    formatPercent(g.completionRate),
    g.avgScore != null ? g.avgScore : "—",
    g.highScore != null ? g.highScore : "—",
    g.repeatPlays, formatPercent(g.retryRate), g.exits
  ]);
  return [head, ...rows];
}
function buildRecentEventRows() {
  const head = ["Time","Event","Game","Score","Time Spent","Device","Page"];
  const recent = [...rawEvents].sort((a,b)=> new Date(b.event_time) - new Date(a.event_time)).slice(0, 20);
  return [head, ...recent.map(e => [
    new Date(e.event_time).toLocaleString(),
    e.event_name || "—",
    gameDisplayName(e.game_id || "", (e.metadata && e.metadata.game_name)) || "—",
    Number.isFinite(e.score) ? e.score : "—",
    Number.isFinite(e.duration_seconds) ? e.duration_seconds + "s" : "—",
    (rawAnonUsers.find(u => u.anonymous_user_id === e.anonymous_user_id) || {}).device_type || "—",
    (e.metadata && e.metadata.page_path) || "—"
  ])];
}
function buildRawEventRows() {
  const head = ["ID","Created At","Event Name","Game Name","Page Path","Anonymous User ID","Session ID","Score","Time Spent Seconds","Device Type","Referrer"];
  return [head, ...rawEvents.map(e => [
    e.id != null ? e.id : "",
    e.created_at || e.event_time || "",
    e.event_name || "",
    (e.metadata && e.metadata.game_name) || "",
    (e.metadata && e.metadata.page_path) || "",
    e.anonymous_user_id || "",
    e.session_id || "",
    Number.isFinite(e.score) ? e.score : "",
    Number.isFinite(e.duration_seconds) ? e.duration_seconds : "",
    (rawAnonUsers.find(u => u.anonymous_user_id === e.anonymous_user_id) || {}).device_type || "",
    (e.metadata && e.metadata.referrer) || ""
  ])];
}
function buildGameSessionRows() {
  const head = ["Started","Ended","Game","Duration (s)","Score","High Level","Completed","Exited","Anon User ID","Session ID"];
  return [head, ...rawGameSessions.map(s => [
    s.started_at || "", s.ended_at || "",
    gameDisplayName(s.game_id || "", s.game_name) || "",
    s.duration_seconds || 0,
    Number.isFinite(s.score) ? s.score : "",
    Number.isFinite(s.highest_level) ? s.highest_level : "",
    s.completed ? "Yes" : "No",
    s.exited ? "Yes" : "No",
    s.anonymous_user_id || "", s.session_id || ""
  ])];
}
function buildDailyGrowthRows() {
  const head = ["Date","New Users","Returning Users","Visits","Plays","Completions"];
  const byDay = {};
  rawAnonUsers.forEach(u => {
    if (!u.first_seen_at) return;
    const k = new Date(u.first_seen_at).toISOString().slice(0,10);
    byDay[k] = byDay[k] || { newU: 0, retU: 0, visits: 0, plays: 0, completes: 0 };
    if (u.is_returning_user) byDay[k].retU++; else byDay[k].newU++;
  });
  rawEvents.forEach(e => {
    const k = new Date(e.event_time || e.created_at).toISOString().slice(0,10);
    byDay[k] = byDay[k] || { newU: 0, retU: 0, visits: 0, plays: 0, completes: 0 };
    if (e.event_name === "page_view")      byDay[k].visits++;
    if (e.event_name === "game_start")     byDay[k].plays++;
    if (e.event_name === "game_complete")  byDay[k].completes++;
  });
  const days = Object.keys(byDay).sort();
  return [head, ...days.map(k => [k, byDay[k].newU, byDay[k].retU, byDay[k].visits, byDay[k].plays, byDay[k].completes])];
}
function buildSourcesRows() {
  const head = ["Source","Users","Returning","Plays"];
  const map = {};
  rawAnonUsers.forEach(u => {
    const k = u.utm_source || u.source || "direct";
    map[k] = map[k] || { users: 0, ret: 0, plays: 0 };
    map[k].users++; if (u.is_returning_user) map[k].ret++;
  });
  const userSrc = {};
  rawAnonUsers.forEach(u => { userSrc[u.anonymous_user_id] = u.utm_source || u.source || "direct"; });
  rawGameSessions.forEach(s => {
    const k = userSrc[s.anonymous_user_id] || "direct";
    if (!map[k]) map[k] = { users: 0, ret: 0, plays: 0 };
    map[k].plays++;
  });
  const rows = Object.entries(map).sort((a,b)=>b[1].users-a[1].users).map(([k,v])=>[k,v.users,v.ret,v.plays]);
  return [head, ...rows];
}

function downloadWorkbook(filename, sheets) {
  if (typeof window.XLSX !== "undefined") {
    try {
      const wb = XLSX.utils.book_new();
      sheets.forEach(s => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), (s.name || "Sheet").slice(0,31)));
      XLSX.writeFile(wb, filename + ".xlsx");
      return;
    } catch (e) { console.warn("XLSX failed, CSV fallback:", e); }
  }
  if (sheets.length === 1) downloadCsv(filename + ".csv", sheets[0].rows);
  else sheets.forEach((s, i) => downloadCsv(filename + "_" + (s.name || ("Sheet"+(i+1))).replace(/[^\w-]+/g,"_") + ".csv", s.rows));
}
function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(v => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function exportGameReport()    { downloadWorkbook("Gulsabi_Game_Report_"      + getTodayString(), [{ name: "Game Report",   rows: buildGameReportRows()   }]); }
function exportRecentEvents()  { downloadWorkbook("Gulsabi_Recent_Events_"   + getTodayString(), [{ name: "Recent Events", rows: buildRecentEventRows() }]); }
function exportOverview()      { downloadWorkbook("Gulsabi_Overview_"        + getTodayString(), [{ name: "Overview",      rows: buildSummaryRows()      }]); }
function exportSessions()      { downloadWorkbook("Gulsabi_Game_Sessions_"   + getTodayString(), [{ name: "Game Sessions", rows: buildGameSessionRows() }]); }
function exportDailyGrowth()   { downloadWorkbook("Gulsabi_Daily_Growth_"    + getTodayString(), [{ name: "Daily Growth",  rows: buildDailyGrowthRows() }]); }
function exportSourcesCsv()    { downloadCsv     ("Gulsabi_Traffic_Sources_" + getTodayString() + ".csv", buildSourcesRows()); }
function exportFullAnalytics() {
  downloadWorkbook("Gulsabi_Full_Analytics_" + getTodayString(), [
    { name: "Summary",       rows: buildSummaryRows()      },
    { name: "Game Report",   rows: buildGameReportRows()   },
    { name: "Recent Events", rows: buildRecentEventRows() },
    { name: "Raw Events",    rows: buildRawEventRows()    },
    { name: "Game Sessions", rows: buildGameSessionRows() },
    { name: "Daily Growth",  rows: buildDailyGrowthRows() }
  ]);
}

/* PDF — investor summary (one page) */
function exportInvestorPDF() {
  if (typeof window.jspdf === "undefined") {
    alert("PDF library failed to load. Try again in a moment.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;
  doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.text("Gulsabi Analytics", 40, y); y += 26;
  doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(110);
  doc.text("Investor Summary · " + new Date().toLocaleDateString() + " · " + (dateFilter === "all" ? "All time" : dateFilter + " day window"), 40, y); y += 22;
  doc.setTextColor(0);

  const s = computedSummary || {};
  const rows = [
    ["Total anonymous users",    s.totalUsers || 0],
    ["Game sessions",            s.totalSessions || 0],
    ["Total play minutes",       s.totalMins || 0],
    ["Average game time",        s.avgPlay || "—"],
    ["Returning user rate",      formatPercent(s.totalUsers ? (rawAnonUsers.filter(u=>u.is_returning_user).length / Math.max(s.totalUsers,1)) : 0)],
    ["Day 7 retention",          formatPercent(retentionPct(7))],
    ["Most played game",         s.mostPlayed || "—"],
    ["Best retention game",      s.bestRet || "—"],
    ["PWA installs",             s.pwaInstalls || 0],
    ["Install conversion rate",  formatPercent(s.pwaConv)],
    ["Top traffic source",       topSource()],
    ["Best performing game",     (computedGameReport[0] && computedGameReport[0].game) || "—"]
  ];

  doc.setFontSize(11);
  rows.forEach(([label, val]) => {
    doc.setFont("helvetica","normal"); doc.setTextColor(110);
    doc.text(String(label), 40, y);
    doc.setFont("helvetica","bold"); doc.setTextColor(0);
    doc.text(String(val), W - 40, y, { align: "right" });
    y += 22;
    doc.setDrawColor(230); doc.line(40, y - 8, W - 40, y - 8);
  });

  y += 18;
  doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(140);
  doc.text("This report contains anonymous analytics only. No child personal data is included.", 40, y);
  doc.save("Gulsabi_Investor_Summary_" + getTodayString() + ".pdf");
}
function topSource() {
  const m = {};
  rawAnonUsers.forEach(u => { const k = u.utm_source || u.source || "direct"; m[k] = (m[k]||0) + 1; });
  const top = Object.entries(m).sort((a,b)=>b[1]-a[1])[0];
  return top ? top[0] : "—";
}

/* Wire export buttons */
document.getElementById("exportGameBtn")  ?.addEventListener("click", exportGameReport);
document.getElementById("exportEventsBtn")?.addEventListener("click", exportRecentEvents);
document.getElementById("exportFullBtn")  ?.addEventListener("click", exportFullAnalytics);
document.getElementById("expOverviewBtn") ?.addEventListener("click", exportOverview);
document.getElementById("expSessionsBtn") ?.addEventListener("click", exportSessions);
document.getElementById("expGrowthBtn")   ?.addEventListener("click", exportDailyGrowth);
document.getElementById("expSourcesBtn")  ?.addEventListener("click", exportSourcesCsv);
document.getElementById("expInvestorBtn") ?.addEventListener("click", exportInvestorPDF);

checkSession();
