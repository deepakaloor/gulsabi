import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWtzdnlwZnJudmhibnNyb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMzc5ODYsImV4cCI6MjA2MzkxMzk4Nn0.VktRIH-8HNwXUSTnLdPuA64H5y6VgRFNvuTbDBrCHu4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBox  = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginBtn  = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
let recoveryBox = null;

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
    recoveryBox.style.cssText = "max-width:400px;margin:80px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12);text-align:center;font-family:sans-serif;";
    recoveryBox.innerHTML = '<h2 style="color:#6a0dad;margin-bottom:8px;">Set New Password</h2><p style="color:#666;margin-bottom:24px;font-size:14px;">Enter your new password below.</p><input id="newPassword" type="password" placeholder="New password (min 8 chars)" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;margin-bottom:12px;" /><input id="confirmPassword" type="password" placeholder="Confirm new password" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;margin-bottom:16px;" /><div id="recoveryError" style="color:red;font-size:13px;margin-bottom:12px;"></div><button id="setPasswordBtn" style="width:100%;padding:12px;background:#6a0dad;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;">Set Password</button>';
    document.body.appendChild(recoveryBox);
    document.getElementById("setPasswordBtn").addEventListener("click", async () => {
      const newPass = document.getElementById("newPassword").value;
      const confirmPass = document.getElementById("confirmPassword").value;
      const errEl = document.getElementById("recoveryError");
      if (newPass.length < 8) { errEl.textContent = "Password must be at least 8 characters."; return; }
      if (newPass !== confirmPass) { errEl.textContent = "Passwords do not match."; return; }
      errEl.textContent = "";
      document.getElementById("setPasswordBtn").textContent = "Saving...";
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) { errEl.textContent = "Error: " + error.message; document.getElementById("setPasswordBtn").textContent = "Set Password"; return; }
      recoveryBox.innerHTML = '<h2 style="color:#4caf50;margin-bottom:8px;">&#10003; Password Updated!</h2><p style="color:#555;margin-bottom:24px;">Your password has been set successfully.</p><button onclick="window.location.reload()" style="padding:12px 32px;background:#6a0dad;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;">Go to Login</button>';
    });
  }
  recoveryBox.style.display = "block";
}

loginBtn && loginBtn.addEventListener("click", async () => {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  loginBtn.textContent = "Logging in...";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  loginBtn.textContent = "Login";
  if (error) { document.getElementById("loginError").textContent = "Login failed. Check email and password."; return; }
  document.getElementById("loginError").textContent = "";
  showDashboard();
});

logoutBtn && logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  dashboard.style.display = "none";
  loginBox.style.display = "block";
});

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
  if (session) { showDashboard(); } else { loginBox.style.display = "block"; dashboard.style.display = "none"; }
}

async function loadDashboard() {
  const { data, error } = await supabase.from("game_events").select("*").limit(5000);
  if (error) { console.error("Error loading data:", error); return; }
  renderDashboard(data || []);
}

function renderDashboard(events) {
  const views       = events.filter(e => e.event_name === "page_view").length;
  const starts      = events.filter(e => e.event_name === "game_started").length;
  const completions = events.filter(e => e.event_name === "game_completed").length;
  const uniqueUsers = new Set(events.map(e => e.anonymous_user_id).filter(Boolean)).size;
  const completedWithTime = events.filter(e => e.event_name === "game_completed" && e.time_spent_seconds > 0);
  const avgTime = completedWithTime.length ? Math.round(completedWithTime.reduce((sum, e) => sum + e.time_spent_seconds, 0) / completedWithTime.length) : 0;
  document.getElementById("totalViews").textContent           = views;
  document.getElementById("totalGameStarts").textContent      = starts;
  document.getElementById("totalGameCompletions").textContent = completions;
  document.getElementById("uniqueUsers").textContent          = uniqueUsers;
  document.getElementById("averageTime").textContent          = avgTime + "s";
  renderGameReport(events);
  renderRecentEvents(events);
}

function renderGameReport(events) {
  const games = {};
  events.forEach(e => {
    const g = e.game_name; if (!g) return;
    if (!games[g]) games[g] = { plays: 0, completions: 0, scores: [], times: [] };
    if (e.event_name === "game_started")   games[g].plays++;
    if (e.event_name === "game_completed") { games[g].completions++; if (e.score != null) games[g].scores.push(e.score); if (e.time_spent_seconds != null) games[g].times.push(e.time_spent_seconds); }
  });
  const tbody = document.getElementById("gameReportBody");
  tbody.innerHTML = "";
  Object.entries(games).forEach(([name, stats]) => {
    const avgScore = stats.scores.length ? Math.round(stats.scores.reduce((a,b) => a+b,0) / stats.scores.length) : "-";
    const avgTime  = stats.times.length  ? Math.round(stats.times.reduce((a,b)  => a+b,0) / stats.times.length)  + "s" : "-";
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>" + name + "</td><td>" + stats.plays + "</td><td>" + stats.completions + "</td><td>" + avgScore + "</td><td>" + avgTime + "</td>";
    tbody.appendChild(tr);
  });
}

function renderRecentEvents(events) {
  const recent = [...events].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
  const tbody  = document.getElementById("recentEventsBody");
  tbody.innerHTML = "";
  recent.forEach(e => {
    const tr = document.createElement("tr");
    const time = new Date(e.created_at).toLocaleString();
    tr.innerHTML = "<td>" + time + "</td><td>" + e.event_name + "</td><td>" + (e.game_name || "-") + "</td><td>" + (e.page_path || "-") + "</td><td>" + (e.score != null ? e.score : "-") + "</td><td>" + (e.time_spent_seconds != null ? e.time_spent_seconds + "s" : "-") + "</td>";
    tbody.appendChild(tr);
  });
}

checkSession();
