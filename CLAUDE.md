# CLAUDE.md — Gulsabi World

This file documents the structure, conventions, and development workflows for the **Gulsabi World** repository, intended to help AI assistants contribute effectively.

---

## Project Overview

**Gulsabi World** is a children's entertainment web ecosystem built by [Pixnut](https://pixnut.com), hosted on GitHub Pages at `gulsabi.com`. It consists of a landing page hub and two browser-based arcade games featuring the Gulsabi character.

**Technology stack:** Pure HTML5 + CSS3 + Vanilla JavaScript — no build tools, no frameworks, no package managers.

---

## Repository Structure

```
gulsabi/
├── CNAME                    # GitHub Pages custom domain → gulsabi.com
├── index.html               # Landing page (Gulsabi World hub)
├── about.html               # About page (Gulsabi, mission, Pixnut)
├── assets/                  # Shared media for landing page
│   ├── hero-video.mp4       # Full-screen hero section background
│   ├── Normal 1.mp4         # Costume section video loop (normal Gulsabi)
│   ├── Super 1.mp4          # Costume section video loop (super Gulsabi)
│   ├── game1.jpg            # Game 1 card thumbnail
│   └── game2.jpg            # Game 2 card thumbnail
├── images/                  # Brand assets used by landing/about/games
│   ├── gulsabi-logo.png
│   ├── gulsabi-buddy-mode.mp4
│   ├── gulsabi-super-mode.mp4
│   └── ... (icons, bridge, ecosystem map, thinking sprite)
├── campaigns/
│   └── summer.html          # "Gulsabi Summer" marketing landing page
└── games/                   # All arcade games — each is a self-contained folder
    ├── game1/               # "Sky Adventure" — flappy-bird-style arcade game
    │   ├── index.html       # Entire game: markup + embedded CSS + embedded JS
    │   ├── gulsabi-game-fly.png  # Player character sprite
    │   ├── unicorn-powerup.svg
    │   └── audio/
    │       ├── gulsabi_chant.mp3
    │       ├── invincible.mp3
    │       ├── jetpack.mp3
    │       └── level_up.mp3
    ├── game2/               # "Cannon Color Range" — color-matching cannon game
    │   ├── index.html       # Entire game: markup + embedded CSS + embedded JS
    │   ├── gulsabi-happy.png       # Character mood sprite (correct answer)
    │   ├── gulsabi-normal.png      # Character mood sprite (idle)
    │   ├── gulsabi-sad.png         # Character mood sprite (wrong answer)
    │   ├── gulsabi-thinking.png    # Character mood sprite (timer running)
    │   ├── assets/          # 80 color-themed object images (10 per color)
    │   │   ├── blue-*.jpg   # blue-bird, blue-fish, blue-diamond, etc.
    │   │   ├── green-*.jpg
    │   │   ├── red-*.jpg
    │   │   ├── yellow-*.jpg
    │   │   ├── pink-*.jpg
    │   │   ├── purple-*.jpg
    │   │   ├── orange-*.jpg
    │   │   └── brown-*.jpg
    │   └── audio/
    │       ├── v_start.mp3
    │       ├── v_time_low.mp3
    │       ├── v_gameover.mp3
    │       ├── v_win.mp3
    │       ├── v_powerup.mp3
    │       └── oops.mp3
    ├── game3/               # "Odd One Out" — spot-the-different quiz (WIP)
    │   ├── index.html       # Markup only (NOT self-contained — has split JS/CSS)
    │   ├── script.js        # Quiz logic
    │   └── style.css        # Quiz styling
    └── game4/               # "Memory Match" — card-flipping memory game (solo + 2-player)
        └── index.html       # Entire game: markup + embedded CSS + embedded JS
                             # Reuses sprites and 80 images from ../game2/
```

**Cross-references:** Game 4 (Memory Match) references sprites and card images from `games/game2/` via relative paths (`../game2/gulsabi-happy.png`, `../game2/assets/blue-bird.jpg`), and the brand logo via `../../images/gulsabi-logo.png`. Do not move `games/game2/` without updating these paths.

**Note on Game 3:** [games/game3/](games/game3/index.html) is a work-in-progress and is the only game that uses split `.js`/`.css` files. It references `assets/images/r1_*.png` that do not yet exist — the round artwork still needs to be produced.

---

## Architecture Conventions

### Self-Contained HTML Files

Each game is a **single HTML file** with all CSS and JavaScript inlined in `<style>` and `<script>` blocks. Do not split game code into separate `.css` or `.js` files unless explicitly requested — this keeps each game fully portable.

### No Build Step

There is no compiler, bundler, transpiler, or package manager. Files are served exactly as written. Any change to an HTML file is immediately live — just refresh the browser.

### Vanilla JS Only

Do not introduce external libraries (jQuery, React, Vue, etc.). All game logic uses:
- **Canvas 2D API** (`canvas.getContext('2d')`) for rendering
- **Web Audio API** (`AudioContext`) for synthesized sound effects
- **`requestAnimationFrame`** for the game loop
- **`IntersectionObserver`** for scroll-triggered reveal animations (landing page only)
- **`<audio>` elements** for MP3 voice clips

---

## Design System

### Color Palette (CSS Custom Properties on `index.html`)

| Variable | Hex | Usage |
|---|---|---|
| `--gulsabi-yellow` | `#FFD600` | Costumes section background, accents |
| `--hero-blue` | `#00A3E0` | Adventures section background |
| `--cape-red` | `#FF4F4F` | CTA buttons, footer, headings |
| `--pure-white` | `#ffffff` | Cards, text on dark backgrounds |
| `--text-dark` | `#2c3e50` | Body text |

Individual game files define their own color values inline — replicate the same palette when adding new UI elements to games.

### Typography

All pages use **Fredoka** (Google Fonts), loaded via `<link>` in `<head>`. Font weights used: 400, 600, 700. Do not introduce other typefaces.

### Animation Classes (Landing Page)

| Class | Effect |
|---|---|
| `.reveal-up` | Fade + slide up on scroll |
| `.reveal-left` | Fade + slide in from left |
| `.reveal-right` | Fade + slide in from right |
| `.active` | Applied by IntersectionObserver to trigger the transition |
| `.delay-1`, `.delay-2` | Stagger delays (0.1s, 0.2s) |

---

## Game Summaries

### Game 1 — Sky Adventure (`games/game1/index.html`)

A flappy-bird-style avoidance game.

- **Controls:** Click / Tap / Spacebar → fly upward; gravity pulls down
- **Obstacles:** Aliens and asteroids approach from the right
- **Power-ups:**
  - Unicorn → 6-second invincibility shield
  - Jetpack → 5-second autopilot with auto-shooting
  - Coin → +5 score
- **Progression:** Speed increases each level; 5 sky-color themes unlock with levels
- **Scoring:** Combo multiplier for consecutive avoidances
- **Audio:** Web Audio synthesis for SFX + 4 MP3 voice clips for key events
- **Lives:** 3 hearts; losing all ends the game

### Game 2 — Cannon Color Range (`games/game2/index.html`)

A color-recognition matching game.

- **Gameplay:** A random color-themed object image is shown; player fires a cannon of the matching color within the timer
- **Colors:** 8 categories (blue, green, red, yellow, pink, purple, orange, brown), 10 images each (80 total in `games/game2/assets/`)
- **Timer:** 10-second countdown per round, speeds up as levels progress
- **Lives:** 4 hearts; wrong color or timeout costs a life
- **Scoring:** 500 points per level-up
- **Character moods:** Gulsabi sprite changes expression based on game state (normal → thinking → happy/sad)
- **Audio:** 6 MP3 voice clips + synthesized background music with BPM that increases per level

### Game 3 — Odd One Out (`games/game3/index.html`) — WIP

A spot-the-different quiz built around grids of similar images.

- **Status:** Work-in-progress; only rounds 1–2 are wired in `script.js`. Needs round artwork (`assets/images/r{n}_same.png`, `r{n}_odd.png`) and finished UX.
- **Structure:** 5 rounds × 6 questions, 10s timer each.
- **Exception:** The only game using split `.js`/`.css` files — finish wiring before treating it as production.

### Game 4 — Memory Match (`games/game4/index.html`)

A card-flipping memory game with two distinct modes.

- **Solo (10 levels):** Slow-ramp progression from 3 pairs → 18 pairs, per-level 3-star rating, coins economy, 3 power-ups (Peek / Hint / +1 Life), achievements with toast notifications, daily streak bonus, continue-with-coins revive, journey-dot map on start screen.
- **2 Players (couch mode):** Turn-based pair-matching with live scoreboard. Match → score + go again; miss → switch turn. Three difficulty tiers (Easy 6 pairs / Medium 10 / Hard 15). No timer or lives.
- **Persistence:** `localStorage` keys under `gulsabi_game4_*` (high score, stars, best per level, coins, total earned, achievements, last play date, streak).
- **Audio:** Fully synthesized Web Audio scheduler (bass + arp + counter + chord stabs + drum layer). BPM ramps with level. Auto-stops on `visibilitychange`, `pagehide`, `beforeunload`, and pause.
- **Brand:** Uses all 4 Gulsabi mood sprites (normal / happy / sad / thinking) from `games/game2/` and the logo from `images/gulsabi-logo.png`.
- **Cross-deps:** References `../game2/assets/*.jpg` and `../game2/gulsabi-*.png` — keep `games/game2/` colocated.

---

## Development Workflow

### Running Locally

Open any HTML file directly in a browser — no server required:

```bash
# Option A: file:// protocol (simplest)
open index.html          # macOS
xdg-open index.html      # Linux

# Option B: lightweight local server (avoids CORS on video autoplay in some browsers)
python3 -m http.server 8080
# then visit http://localhost:8080
```

### Making Changes

1. Edit the relevant HTML file directly
2. Refresh the browser (no compile step)
3. Test on both desktop and mobile viewport sizes (games support touch events)
4. Verify audio works (browser may require a user gesture before audio plays — this is by design)

### Nav Bar

Both `index.html` and `about.html` share a fixed nav bar pattern:
- Transparent by default; gets a dark blurred background (`rgba(0,0,0,0.65)` + `backdrop-filter`) once the user scrolls past 50px
- Brand link on the left; page links on the right
- Active page uses `.active-link` class (yellow underline)
- Nav CSS lives in each page's own `<style>` block — keep them in sync when modifying shared nav styles

### Adding a New Game

1. Create `games/game{N}/index.html` (self-contained, following the same pattern as game1, game2, and game4)
2. Add a thumbnail to `assets/` (or reuse a Gulsabi sprite from `games/game2/`)
3. Add a new `<a class="game-card">` block in `index.html` under `.games-container`, linking to `games/game{N}/index.html`
4. Follow the same CSS variable palette and Fredoka font
5. If the game uses `localStorage`, namespace keys as `gulsabi_game{N}_*`

### Adding New Color-Object Images (Game 2)

- File naming convention: `{color}-{object}.jpg` (e.g., `purple-grape.jpg`)
- Place inside `games/game2/assets/`
- Register the new image in the `imagesByColor` object inside `games/game2/index.html`

---

## Git Workflow

- **Main branch:** `master` (production, auto-deployed via GitHub Pages)
- **Feature branches:** Use `claude/<short-descriptor>` naming for AI-assisted work
- **Deployment:** Pushing to `master` automatically updates `gulsabi.com` via GitHub Pages

```bash
# Standard workflow
git checkout -b claude/<feature-name>
# ... make changes ...
git add <specific files>
git commit -m "Brief description of change"
git push -u origin claude/<feature-name>
```

Do not use `git add -A` or `git add .` carelessly — the `games/game2/assets/` directory contains ~80 large images; only stage files you intentionally modified.

---

## Testing

There is no automated test suite. Validate changes manually:

- **Landing page:** Check scroll animations, video autoplay, game card hover effects, responsive layout at ≤1100px, nav bar scroll behaviour
- **About page:** Check all four sections render, character image loads from `images/gulsabi-thinking.png`, video sources from `images/`, nav active state shows "About" underlined
- **Sky Adventure (games/game1):** Verify collision detection, power-up timers, score/level progression, audio triggers
- **Cannon Color Range (games/game2):** Verify color matching logic, timer, mood sprite changes, cannon animation, all 8 color categories
- **Odd One Out (games/game3):** WIP — verify start screen renders; gameplay needs round artwork before full QA
- **Memory Match (games/game4):** Verify solo flow (start → all 10 levels), 2-player turn switching, scoreboard active-state toggling, power-ups, daily streak, music auto-stop on tab hide/close, localStorage isolation from other games

---

## Key Constraints

- **No external JS libraries** — keep all game logic vanilla
- **No build tools** — do not add npm, webpack, vite, etc.
- **Audience is children** — keep UI bright, simple, low-friction; no dark patterns
- **Mobile-first** — all new UI must work with touch events and small screens
- **Asset filenames with spaces** (`Normal 1.mp4`, `Super 1.mp4`) are referenced with spaces in HTML `src` attributes — maintain this exactly or update all references together
- **Copyright:** All content belongs to Pixnut; do not introduce third-party assets without clearance
