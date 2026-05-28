/* ═════════════════════════════════════════════════════════════════
   Gulsabi Kids — Service Worker
   Bumping CACHE_VERSION invalidates all caches on existing installs
   and forces the new shell to be fetched. The activate handler then
   calls clients.claim() so every open tab immediately uses the new
   SW without a manual reload.
   ───────────────────────────────────────────────────────────────── */
const CACHE_VERSION = 'gulsabi-v6';
const CORE_CACHE    = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/* Core app shell — must be cached on install for offline to work */
const CORE_URLS = [
  './',
  'index.html',
  'about.html',
  'games.html',
  'manifest.json',
  'images/gulsabi-logo.png',
  'images/gulsabi-app-icon.png',
  'images/gulsabi-loading.jpg',
  'images/icons/gulsabi-app-icon-192.png',
  'images/icons/gulsabi-app-icon-512.png',
  'images/icons/gulsabi-app-icon-512-maskable.png',
  'assets/game1.jpg',
  'assets/game2.jpg',
  'assets/game3.jpg',
  'assets/game4.jpg',
  'assets/game5.jpg',
  'assets/cover-video.mp4',
  'assets/icons/youtube-icon.png',
  'assets/icons/games-icon.png',
  'assets/icons/instagram-icon.png',
  'assets/icons/facebook-icon.png',
  'assets/icons/ai-assistant-icon.png',
  'js/main.js',
  'js/analytics.js',
  // game 1
  'games/game1/index.html',
  'games/game1/gulsabi-game-fly.png',
  'games/game1/unicorn-powerup.svg',
  // game 2 (shared sprites used by other games too)
  'games/game2/index.html',
  'games/game2/gulsabi-normal.png',
  'games/game2/gulsabi-happy.png',
  'games/game2/gulsabi-sad.png',
  'games/game2/gulsabi-thinking.png',
  // games 3, 4, 5
  'games/game3/index.html',
  'games/game4/index.html',
  'games/game5/index.html'
];

/* ── INSTALL — pre-cache the shell, then take over immediately ── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Best-effort: don't fail the install just because one URL 404s
    await Promise.allSettled(CORE_URLS.map(u => cache.add(u).catch(() => null)));
    await self.skipWaiting();
  })());
});

/* ── ACTIVATE — drop ALL old caches + claim every open client ── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CORE_CACHE && k !== RUNTIME_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ── FETCH ──
   - HTML navigations: NETWORK-FIRST. Always try fresh first so the app
     loads the latest deployed code; fall back to cache if offline.
   - Other GETs (CSS/JS/images/audio/video): stale-while-revalidate.
*/
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Don't intercept cross-origin (Supabase, YouTube, etc.) — let it pass.
  // Exception: Google Fonts, which is safe and useful to cache.
  if (url.origin !== self.location.origin
      && !url.host.includes('fonts.googleapis.com')
      && !url.host.includes('fonts.gstatic.com')) {
    return;
  }

  const isNav = req.mode === 'navigate' || req.destination === 'document';

  if (isNav) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CORE_CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return (await caches.match('games.html'))
            || (await caches.match('index.html'))
            || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Stale-while-revalidate for everything else
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchAndCache = fetch(req).then(res => {
      if (res && res.ok) {
        caches.open(RUNTIME_CACHE).then(c => c.put(req, res.clone()).catch(() => {}));
      }
      return res;
    }).catch(() => null);

    if (cached) {
      // Return cached immediately, refresh in background
      fetchAndCache;
      return cached;
    }
    return (await fetchAndCache)
        || new Response('Offline asset unavailable', { status: 503 });
  })());
});

/* ── MESSAGE — page asks us to take over immediately ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
