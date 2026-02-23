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
├── assets/                  # Shared media for landing page
│   ├── hero-video.mp4       # Full-screen hero section background
│   ├── Normal 1.mp4         # Costume section video loop (normal Gulsabi)
│   ├── Super 1.mp4          # Costume section video loop (super Gulsabi)
│   ├── game1.jpg            # Game 1 card thumbnail
│   └── game2.jpg            # Game 2 card thumbnail
├── game1/                   # "Sky Adventure" — flappy-bird-style arcade game
│   ├── index.html           # Entire game: markup + embedded CSS + embedded JS
│   ├── gulsabi-game-fly.png # Player character sprite
│   └── audio/
│       ├── gulsabi_chant.mp3
│       ├── invincible.mp3
│       ├── jetpack.mp3
│       └── level_up.mp3
└── game2/                   # "Cannon Color Range" — color-matching cannon game
    ├── index.html           # Entire game: markup + embedded CSS + embedded JS
    ├── gulsabi-happy.png    # Character mood sprite (correct answer)
    ├── gulsabi-normal.png   # Character mood sprite (idle)
    ├── gulsabi-sad.png      # Character mood sprite (wrong answer)
    ├── gulsabi-thinking.png # Character mood sprite (timer running)
    ├── assets/              # 80 color-themed object images (10 per color)
    │   ├── blue-*.jpg       # blue-bird, blue-fish, blue-diamond, etc.
    │   ├── green-*.jpg
    │   ├── red-*.jpg
    │   ├── yellow-*.jpg
    │   ├── pink-*.jpg
    │   ├── purple-*.jpg
    │   ├── orange-*.jpg
    │   └── brown-*.jpg
    └── audio/
        ├── v_start.mp3
        ├── v_time_low.mp3
        ├── v_gameover.mp3
        ├── v_win.mp3
        ├── v_powerup.mp3
        └── oops.mp3
```

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

### Game 1 — Sky Adventure (`game1/index.html`)

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

### Game 2 — Cannon Color Range (`game2/index.html`)

A color-recognition matching game.

- **Gameplay:** A random color-themed object image is shown; player fires a cannon of the matching color within the timer
- **Colors:** 8 categories (blue, green, red, yellow, pink, purple, orange, brown), 10 images each (80 total in `game2/assets/`)
- **Timer:** 10-second countdown per round, speeds up as levels progress
- **Lives:** 4 hearts; wrong color or timeout costs a life
- **Scoring:** 500 points per level-up
- **Character moods:** Gulsabi sprite changes expression based on game state (normal → thinking → happy/sad)
- **Audio:** 6 MP3 voice clips + synthesized background music with BPM that increases per level

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

### Adding a New Game

1. Create `game3/index.html` (self-contained, following the same pattern as `game1` and `game2`)
2. Add a thumbnail `assets/game3.jpg`
3. Add a new `<a class="game-card">` block in `index.html` under `.games-container`
4. Follow the same CSS variable palette and Fredoka font

### Adding New Color-Object Images (Game 2)

- File naming convention: `{color}-{object}.jpg` (e.g., `purple-grape.jpg`)
- Place inside `game2/assets/`
- Register the new image in the `imagesByColor` object inside `game2/index.html`

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

Do not use `git add -A` or `git add .` carelessly — the `game2/assets/` directory contains ~80 large images; only stage files you intentionally modified.

---

## Testing

There is no automated test suite. Validate changes manually:

- **Landing page:** Check scroll animations, video autoplay, game card hover effects, responsive layout at ≤1100px
- **Sky Adventure:** Verify collision detection, power-up timers, score/level progression, audio triggers
- **Cannon Color Range:** Verify color matching logic, timer, mood sprite changes, cannon animation, all 8 color categories

---

## Key Constraints

- **No external JS libraries** — keep all game logic vanilla
- **No build tools** — do not add npm, webpack, vite, etc.
- **Audience is children** — keep UI bright, simple, low-friction; no dark patterns
- **Mobile-first** — all new UI must work with touch events and small screens
- **Asset filenames with spaces** (`Normal 1.mp4`, `Super 1.mp4`) are referenced with spaces in HTML `src` attributes — maintain this exactly or update all references together
- **Copyright:** All content belongs to Pixnut; do not introduce third-party assets without clearance
