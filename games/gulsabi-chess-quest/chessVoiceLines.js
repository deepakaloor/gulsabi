/* ════════════════════════════════════════════════════════════════════════
   Gulsabi Chess Quest — voice line registry + safe player.
   Mirrors gulsabi-chess-voice-lines.csv. Generated MP3s live in
   /assets/chess/audio/ (run scripts/generate-gulsabi-voiceovers.js to create
   them). The player NEVER throws and fails silently if a file isn't generated
   yet, so the game works with or without voiceovers.
   Usage from the game:  window.CHESS_VOICE.say("praise")  // id OR category
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  var BASE = "/assets/chess/audio/";

  // Keep in sync with gulsabi-chess-voice-lines.csv
  var LINES = [
    { id: "intro_01", filename: "intro-01.mp3", text: "Welcome to Gulsabi Chess Quest!", category: "intro" },
    { id: "intro_02", filename: "intro-02.mp3", text: "Let's learn chess together!", category: "intro" },
    { id: "mode_learn", filename: "mode-learn.mp3", text: "Let's go on a learning adventure!", category: "mode" },
    { id: "mode_bot", filename: "mode-bot.mp3", text: "Ready to play a game against me?", category: "mode" },
    { id: "mode_2p", filename: "mode-2p.mp3", text: "Two players, one board. Let's play!", category: "mode" },
    { id: "mode_practice", filename: "mode-practice.mp3", text: "Time to practice your pieces!", category: "mode" },
    { id: "lesson_pawn", filename: "lesson-pawn.mp3", text: "Pawns move one step forward, and capture diagonally.", category: "lesson" },
    { id: "lesson_rook", filename: "lesson-rook.mp3", text: "Rooks move in straight lines.", category: "lesson" },
    { id: "lesson_bishop", filename: "lesson-bishop.mp3", text: "Bishops move diagonally on the same colour.", category: "lesson" },
    { id: "lesson_knight", filename: "lesson-knight.mp3", text: "Knights jump in an L shape.", category: "lesson" },
    { id: "lesson_queen", filename: "lesson-queen.mp3", text: "The queen is the strongest piece on the board.", category: "lesson" },
    { id: "lesson_king", filename: "lesson-king.mp3", text: "The king moves one square. Keep him safe.", category: "lesson" },
    { id: "lesson_complete", filename: "lesson-complete.mp3", text: "Lesson complete! You are getting really good!", category: "lesson" },
    { id: "praise_01", filename: "praise-01.mp3", text: "Great move!", category: "praise" },
    { id: "praise_02", filename: "praise-02.mp3", text: "That was smart!", category: "praise" },
    { id: "praise_03", filename: "praise-03.mp3", text: "You found the right square!", category: "praise" },
    { id: "nudge_01", filename: "nudge-01.mp3", text: "Almost. Try one of the glowing squares.", category: "nudge" },
    { id: "nudge_02", filename: "nudge-02.mp3", text: "Look carefully. This piece moves differently.", category: "nudge" },
    { id: "nudge_03", filename: "nudge-03.mp3", text: "Good try. Let's try again.", category: "nudge" },
    { id: "capture_01", filename: "capture-01.mp3", text: "That's a capture!", category: "moves" },
    { id: "check_01", filename: "check-01.mp3", text: "Careful, the king is in danger!", category: "moves" },
    { id: "fork_01", filename: "fork-01.mp3", text: "That's a fork!", category: "tactics" },
    { id: "pin_01", filename: "pin-01.mp3", text: "Nice pin!", category: "tactics" },
    { id: "bot_thinking_01", filename: "bot-thinking-01.mp3", text: "Gulsabi is thinking...", category: "bot" },
    { id: "bot_nice_01", filename: "bot-nice-01.mp3", text: "Nice move!", category: "bot" },
    { id: "win_01", filename: "win-01.mp3", text: "Wow! You won the chess quest!", category: "result" },
    { id: "lose_01", filename: "lose-01.mp3", text: "Good try. Let's play again!", category: "result" },
    { id: "draw_01", filename: "draw-01.mp3", text: "That was a close game!", category: "result" }
  ];

  var byId = {}, byCat = {};
  LINES.forEach(function (l) { byId[l.id] = l; (byCat[l.category] = byCat[l.category] || []).push(l); });

  var dead = {};      // filenames that 404'd — don't retry (avoids console spam)
  var muted = false;
  var current = null;

  function playLine(line) {
    if (muted || !line || dead[line.filename]) return;
    try {
      if (current) { try { current.pause(); } catch (e) {} }
      var a = new Audio(BASE + line.filename);
      current = a;
      a.addEventListener("error", function () { dead[line.filename] = true; }, { once: true });
      var p = a.play();
      if (p && p.catch) p.catch(function () {}); // autoplay blocked / not generated yet — ignore
    } catch (e) { /* never break gameplay */ }
  }

  window.CHESS_VOICE_LINES = LINES;
  window.CHESS_VOICE = {
    lines: LINES,
    // key may be a line id (e.g. "praise_01") OR a category (e.g. "praise" -> random)
    say: function (key) {
      if (byId[key]) return playLine(byId[key]);
      var arr = byCat[key];
      if (arr && arr.length) return playLine(arr[Math.floor(Math.random() * arr.length)]);
    },
    setMuted: function (m) { muted = !!m; if (muted && current) { try { current.pause(); } catch (e) {} } }
  };
})();
