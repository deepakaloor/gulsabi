import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://liqksvypfrnvhbnsroaa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWtzdnlwZnJudmhibnNyb2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NjA2OTcsImV4cCI6MjA5NTQzNjY5N30.2kO0Ez_-9XqQguZCE4K5GxxnZNTY_pRqqx1vcOrfcmU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBox = document.getElementById("loginBox");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("loginError").textContent = "Login failed. Check email and password.";
    return;
  }
  document.getElementById("loginError").textContent = "";
  showDashboard();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  loginBox.style.display = "block";
  dashboard.style.display = "none";
});

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    showDashboard();
  } else {
    loginBox.style.display = "block";
    dashboard.style.display = "none";
  }
}

async function showDashboard() {
  loginBox.style.display = "none";
  dashboard.style.display = "block";
  await loadDashboard();
}

async function loadDashboard() {
  document.getElementById("dashStatus").textContent = "Loading...";
  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    document.getElementById("dashStatus").textContent = "Error: " + error.message;
    return;
  }
  document.getElementById("dashStatus").textContent = "";
  renderDashboard(data || []);
}

function renderDashboard(events) {
  const pageViews = events.filter(e => e.event_name === "page_view");
  const gameStarts = events.filter(e => e.event_name === "game_started");
  const gameCompletions = events.filter(e => e.event_name === "game_completed");
  const uniqueUsers = new Set(events.map(e => e.anonymous_user_id).filter(Boolean));
  const completedWithTime = gameCompletions.filter(e => typeof e.time_spent_seconds === "number");
  const avgTime = completedWithTime.length
    ? Math.round(completedWithTime.reduce((s, e) => s + e.time_spent_seconds, 0) / completedWithTime.length)
    : 0;

  document.getElementById("totalViews").textContent = pageViews.length;
  document.getElementById("totalGameStarts").textContent = gameStarts.length;
  document.getElementById("totalGameCompletions").textContent = gameCompletions.length;
  document.getElementById("uniqueUsers").textContent = uniqueUsers.size;
  document.getElementById("averageTime").textContent = avgTime + " sec";

  renderGameReport(events);
  renderRecentEvents(events.slice(0, 20));
}

function renderGameReport(events) {
  const games = {};
  events.forEach(event => {
    if (!event.game_name) return;
    if (!games[event.game_name]) {
      games[event.game_name] = { starts: 0, completions: 0, totalScore: 0, scoreCount: 0, totalTime: 0, timeCount: 0 };
    }
    const g = games[event.game_name];
    if (event.event_name === "game_started") g.starts++;
    if (event.event_name === "game_completed") {
      g.completions++;
      if (typeof event.score === "number") { g.totalScore += event.score; g.scoreCount++; }
      if (typeof event.time_spent_seconds === "number") { g.totalTime += event.time_spent_seconds; g.timeCount++; }
    }
  });

  const rows = Object.entries(games).map(([name, g]) => {
    const avgScore = g.scoreCount ? Math.round(g.totalScore / g.scoreCount) : "-";
    const avgTime = g.timeCount ? Math.round(g.totalTime / g.timeCount) + "s" : "-";
    return `<tr><td>${name}</td><td>${g.starts}</td><td>${g.completions}</td><td>${avgScore}</td><td>${avgTime}</td></tr>`;
  }).join("");

  document.getElementById("gameReportBody").innerHTML =
    rows || '<tr><td colspan="5">No game data yet.</td></tr>';
}

function renderRecentEvents(events) {
  const rows = events.map(e => `<tr>
    <td>${new Date(e.created_at).toLocaleString()}</td>
    <td>${e.event_name}</td>
    <td>${e.game_name || "-"}</td>
    <td>${e.score ?? "-"}</td>
    <td>${e.time_spent_seconds ?? "-"}</td>
    <td>${e.device_type || "-"}</td>
  </tr>`).join("");
  document.getElementById("recentEventsBody").innerHTML =
    rows || '<tr><td colspan="6">No events yet.</td></tr>';
}

checkSession();
