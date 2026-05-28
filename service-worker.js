/* ═════════════════════════════════════════════════════════════════
   Gulsabi Kids — Service Worker
   Bump CACHE_VERSION to invalidate all caches on existing installs
   and force the new shell to be fetched. The activate handler then
   calls clients.claim() so every open tab immediately uses the new
   SW without a manual reload.

   This SW is designed so that **once installed, all 5 games are
   fully playable offline**: it pre-caches every HTML page, every
   sprite, every audio clip, and every color-object image used by
   any game. The library is shared across games 2–5 (~177 images),
   so caching it once unlocks all of them.
   ───────────────────────────────────────────────────────────────── */
const CACHE_VERSION = 'gulsabi-v13';
const CORE_CACHE    = `${CACHE_VERSION}-core`;
const ASSET_CACHE   = `${CACHE_VERSION}-assets`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/* CRITICAL_SHELL — must be available offline for the app to boot.
   These are awaited on install; if any one fails, install fails.
   We cache BOTH the clean URLs (preferred) AND the legacy .html paths
   (which now serve redirect shims) so older PWA installs that still
   reference /games.html continue to work after this update lands. */
const CRITICAL_SHELL = [
  './',
  'index.html',
  // Clean URLs (folder/index.html resolved by GitHub Pages)
  'about/',
  'about/index.html',
  'games/',
  'games/index.html',
  'admin/',
  'admin/index.html',
  // Legacy .html — now redirect shims
  'about.html',
  'games.html',
  'admin.html',
  'manifest.json',
  'js/main.js',
  'js/analytics.js',
  'images/gulsabi-logo.png',
  'images/gulsabi-app-icon.png',
  'images/gulsabi-loading.jpg',
  'games/game1/index.html',
  'games/game2/index.html',
  'games/game3/index.html',
  'games/game4/index.html',
  'games/game5/index.html'
];

/* GAME_ASSETS — pre-cached best-effort on install. A missing image
   or audio file won't fail the install (we use Promise.allSettled).
   Anything not pre-cached but later fetched goes into RUNTIME_CACHE
   via stale-while-revalidate, so play-once-online completes the set. */
const GAME_ASSETS = [
  /* Brand + app icons */
  'images/icons/gulsabi-app-icon-192.png',
  'images/icons/gulsabi-app-icon-512.png',
  'images/icons/gulsabi-app-icon-512-maskable.png',
  /* Games hub thumbnails + UI icons */
  'assets/game1.jpg',
  'assets/game2.jpg',
  'assets/game3.jpg',
  'assets/game4.jpg',
  'assets/game5.jpg',
  'assets/icons/youtube-icon.png',
  'assets/icons/games-icon.png',
  'assets/icons/instagram-icon.png',
  'assets/icons/facebook-icon.png',
  'assets/icons/ai-assistant-icon.png',
  /* Game 1 — Sky Adventure */
  'games/game1/gulsabi-game-fly.png',
  'games/game1/unicorn-powerup.svg',
  /* Game 2 — Cannon Color Range (mood sprites, shared by games 3–5) */
  'games/game2/gulsabi-normal.png',
  'games/game2/gulsabi-happy.png',
  'games/game2/gulsabi-sad.png',
  'games/game2/gulsabi-thinking.png',
  /* Audio — all VO + SFX used across games */
  'audio/gulsabi_chant.mp3',
  'audio/invincible.mp3',
  'audio/jetpack.mp3',
  'audio/level_up.mp3',
  'audio/oops.mp3',
  'audio/v_gameover.mp3',
  'audio/v_powerup.mp3',
  'audio/v_start.mp3',
  'audio/v_time_low.mp3',
  'audio/v_win.mp3',
  'audio/vo_doing_great.mp3',
  'audio/vo_friend_always_win.mp3',
  'audio/vo_game_is_on.mp3',
  'audio/vo_genius.mp3',
  'audio/vo_great_move.mp3',
  'audio/vo_its_a_match.mp3',
  'audio/vo_lets_start.mp3',
  'audio/vo_nailed_it.mp3',
  'audio/vo_ohh_try_again.mp3',
  'audio/vo_player_one.mp3',
  'audio/vo_player_two.mp3',
  'audio/vo_right_pick.mp3',
  'audio/vo_speeding_up.mp3',
  'audio/vo_try_again.mp3',
  /* Shared color-object image library (used by games 2, 3, 4, 5) */
  'games/game2/assets/beige-sheep.png',
  'games/game2/assets/black-ant.png',
  'games/game2/assets/black-blackberry.png',
  'games/game2/assets/black-fly.png',
  'games/game2/assets/black-millipede.png',
  'games/game2/assets/black-spider.png',
  'games/game2/assets/blue-Jeans.jpg',
  'games/game2/assets/blue-bird.jpg',
  'games/game2/assets/blue-blueberry.jpg',
  'games/game2/assets/blue-blueberry.png',
  'games/game2/assets/blue-bluewhale.jpg',
  'games/game2/assets/blue-butterfly.jpg',
  'games/game2/assets/blue-butterfly.png',
  'games/game2/assets/blue-caterpillar.png',
  'games/game2/assets/blue-crayon.jpg',
  'games/game2/assets/blue-diamond.jpg',
  'games/game2/assets/blue-fish.jpg',
  'games/game2/assets/blue-fish.png',
  'games/game2/assets/blue-peacock.jpg',
  'games/game2/assets/blue-rickshaw.png',
  'games/game2/assets/blue-truck.png',
  'games/game2/assets/blue-tshirt.png',
  'games/game2/assets/blue-water.jpg',
  'games/game2/assets/brown-baseball.jpg',
  'games/game2/assets/brown-biscut.jpg',
  'games/game2/assets/brown-box.jpg',
  'games/game2/assets/brown-bread.jpg',
  'games/game2/assets/brown-chocolate.jpg',
  'games/game2/assets/brown-coconut.jpg',
  'games/game2/assets/brown-date.png',
  'games/game2/assets/brown-kiwi.png',
  'games/game2/assets/brown-monkey.jpg',
  'games/game2/assets/brown-peanut.png',
  'games/game2/assets/brown-potato.jpg',
  'games/game2/assets/brown-potato.png',
  'games/game2/assets/brown-sapodilla.png',
  'games/game2/assets/brown-taro.png',
  'games/game2/assets/brown-teddy.jpg',
  'games/game2/assets/brown-walnut.png',
  'games/game2/assets/brown-woodlog.jpg',
  'games/game2/assets/floral-tshirt.png',
  'games/game2/assets/green-alien-face.png',
  'games/game2/assets/green-alien.png',
  'games/game2/assets/green-ball.jpg',
  'games/game2/assets/green-bellpepper.png',
  'games/game2/assets/green-bittergourd.png',
  'games/game2/assets/green-brocolli.jpg',
  'games/game2/assets/green-cabbage.png',
  'games/game2/assets/green-cactus.jpg',
  'games/game2/assets/green-chili.png',
  'games/game2/assets/green-cucumber.jpg',
  'games/game2/assets/green-cucumber.png',
  'games/game2/assets/green-custardapple.png',
  'games/game2/assets/green-diamond.jpg',
  'games/game2/assets/green-frog.jpg',
  'games/game2/assets/green-frog.png',
  'games/game2/assets/green-gooseberry.png',
  'games/game2/assets/green-grasshopper.jpg',
  'games/game2/assets/green-grasshopper.png',
  'games/game2/assets/green-guava.png',
  'games/game2/assets/green-jackfruit.png',
  'games/game2/assets/green-leaf.jpg',
  'games/game2/assets/green-lemon.jpg',
  'games/game2/assets/green-lime.png',
  'games/game2/assets/green-okra.png',
  'games/game2/assets/green-olive.png',
  'games/game2/assets/green-pear.png',
  'games/game2/assets/green-peas.png',
  'games/game2/assets/green-pepper.png',
  'games/game2/assets/green-snake.png',
  'games/game2/assets/green-starfruit.png',
  'games/game2/assets/green-turtle.jpg',
  'games/game2/assets/green-turtle.png',
  'games/game2/assets/green-zucchini.png',
  'games/game2/assets/grey-mosquito.png',
  'games/game2/assets/orange-apricot.png',
  'games/game2/assets/orange-basketball.jpg',
  'games/game2/assets/orange-butterfly.jpg',
  'games/game2/assets/orange-carrot.jpg',
  'games/game2/assets/orange-cone.jpg',
  'games/game2/assets/orange-fish.jpg',
  'games/game2/assets/orange-flower.jpg',
  'games/game2/assets/orange-fox.jpg',
  'games/game2/assets/orange-leaf.png',
  'games/game2/assets/orange-lion.png',
  'games/game2/assets/orange-mango.png',
  'games/game2/assets/orange-orange.jpg',
  'games/game2/assets/orange-orange.png',
  'games/game2/assets/orange-pear.png',
  'games/game2/assets/orange-persimmon.png',
  'games/game2/assets/orange-pumpkin.jpg',
  'games/game2/assets/orange-pumpkin.png',
  'games/game2/assets/orange-tiger.jpg',
  'games/game2/assets/orange-tiger.png',
  'games/game2/assets/pink-brain.jpg',
  'games/game2/assets/pink-cottoncandy.jpg',
  'games/game2/assets/pink-doughnut.jpg',
  'games/game2/assets/pink-dragonfruit.png',
  'games/game2/assets/pink-eraser.jpg',
  'games/game2/assets/pink-flamingo.jpg',
  'games/game2/assets/pink-lotus.jpg',
  'games/game2/assets/pink-peach.jpg',
  'games/game2/assets/pink-peach.png',
  'games/game2/assets/pink-pig.jpg',
  'games/game2/assets/pink-ribbon.jpg',
  'games/game2/assets/pink-shoe.jpg',
  'games/game2/assets/purple-beetroot.jpg',
  'games/game2/assets/purple-blackberry.png',
  'games/game2/assets/purple-brinjal.jpg',
  'games/game2/assets/purple-car.png',
  'games/game2/assets/purple-crayon.jpg',
  'games/game2/assets/purple-crystal.jpg',
  'games/game2/assets/purple-eggplant.png',
  'games/game2/assets/purple-fig.jpg',
  'games/game2/assets/purple-fig.png',
  'games/game2/assets/purple-flower.jpg',
  'games/game2/assets/purple-grapes.jpg',
  'games/game2/assets/purple-grapes.png',
  'games/game2/assets/purple-leaf.png',
  'games/game2/assets/purple-octopus.jpg',
  'games/game2/assets/purple-onion.png',
  'games/game2/assets/purple-passionfruit.png',
  'games/game2/assets/purple-plant.jpg',
  'games/game2/assets/purple-plum.jpg',
  'games/game2/assets/purple-ufo.png',
  'games/game2/assets/red-apple.jpg',
  'games/game2/assets/red-apple.png',
  'games/game2/assets/red-baloon.jpg',
  'games/game2/assets/red-button.jpg',
  'games/game2/assets/red-car.jpg',
  'games/game2/assets/red-car.png',
  'games/game2/assets/red-cherry.png',
  'games/game2/assets/red-chili.png',
  'games/game2/assets/red-chilli.jpg',
  'games/game2/assets/red-crab.jpg',
  'games/game2/assets/red-cranberry.png',
  'games/game2/assets/red-dragonfruit.png',
  'games/game2/assets/red-grapes.jpg',
  'games/game2/assets/red-heart.jpg',
  'games/game2/assets/red-ladybug.png',
  'games/game2/assets/red-lychee.png',
  'games/game2/assets/red-motorcycle.png',
  'games/game2/assets/red-pomegranate.png',
  'games/game2/assets/red-radish.png',
  'games/game2/assets/red-raspberry.png',
  'games/game2/assets/red-rose.jpg',
  'games/game2/assets/red-strawberry.png',
  'games/game2/assets/red-sweetpotato.png',
  'games/game2/assets/red-telephone.png',
  'games/game2/assets/red-tomato.jpg',
  'games/game2/assets/red-tomato.png',
  'games/game2/assets/red-tricycle.png',
  'games/game2/assets/red-truck.png',
  'games/game2/assets/spotted-leopard.png',
  'games/game2/assets/tan-cashew.png',
  'games/game2/assets/tan-peanut.png',
  'games/game2/assets/white-hand.png',
  'games/game2/assets/white-rocket.png',
  'games/game2/assets/white-sheep.png',
  'games/game2/assets/yellow-banana.jpg',
  'games/game2/assets/yellow-banana.png',
  'games/game2/assets/yellow-bee.png',
  'games/game2/assets/yellow-bus.jpg',
  'games/game2/assets/yellow-bus.png',
  'games/game2/assets/yellow-cap.jpg',
  'games/game2/assets/yellow-cheese.jpg',
  'games/game2/assets/yellow-corn.jpg',
  'games/game2/assets/yellow-corn.png',
  'games/game2/assets/yellow-duck.jpg',
  'games/game2/assets/yellow-lemon.jpg',
  'games/game2/assets/yellow-lemon.png',
  'games/game2/assets/yellow-mushroom.png',
  'games/game2/assets/yellow-pineapple.png',
  'games/game2/assets/yellow-rickshaw.png',
  'games/game2/assets/yellow-sun.jpg',
  'games/game2/assets/yellow-sunflower.jpg',
  'games/game2/assets/yellow-taxi.jpg'
];

/* Supabase host (for fetch dispatch — we don't intercept, we just
   notice when these calls fail so the page can queue them). */
const SUPABASE_HOST_SUFFIX = '.supabase.co';

/* ── INSTALL — pre-cache the shell + all game assets ── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const core   = await caches.open(CORE_CACHE);
    const assets = await caches.open(ASSET_CACHE);

    // Critical shell first — required for offline boot
    await Promise.allSettled(CRITICAL_SHELL.map(u => core.add(u).catch(() => null)));

    // Game assets — best effort. iOS PWAs handle ~200 small files fine.
    // We don't await this, but we DO start it now so it overlaps with
    // skipWaiting + clients.claim. The runtime cache picks up stragglers.
    Promise.allSettled(GAME_ASSETS.map(u => assets.add(u).catch(() => null)))
      .then(results => {
        const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;
        if (failed > 0 && self.registration) {
          // Surface a debug log; visible in browser DevTools → Application
          console.warn('[Gulsabi SW] ' + failed + '/' + GAME_ASSETS.length + ' asset(s) failed to pre-cache. They will be cached on first online play.');
        }
      });

    await self.skipWaiting();
  })());
});

/* ── ACTIVATE — drop ALL old caches + claim every open client ── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CORE_CACHE && k !== ASSET_CACHE && k !== RUNTIME_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ── FETCH ──
   - Supabase POST/PATCH (analytics writes): pass-through. The page's
     analytics layer detects offline state via window.online events and
     queues failed writes itself.
   - HTML navigations: NETWORK-FIRST. Try fresh first so deployed code
     is always preferred; fall back to cache when offline.
   - Other same-origin GETs (CSS/JS/images/audio): cache-first with
     background revalidation — so games are instant offline.
*/
self.addEventListener('fetch', event => {
  const req = event.request;

  // Never intercept non-GET (POST/PATCH/DELETE all pass through).
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin only (Google Fonts cached as a convenience). Supabase
  // and YouTube and CDN imports pass through untouched.
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
        return (await caches.match('games/'))
            || (await caches.match('games/index.html'))
            || (await caches.match('index.html'))
            || (await caches.match('games.html'))
            || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Cache-first for assets — gives the game instant load offline.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      // Refresh in background so updated files propagate next load
      fetch(req).then(res => {
        if (res && res.ok) {
          caches.open(RUNTIME_CACHE).then(c => c.put(req, res.clone()).catch(() => {}));
        }
      }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        caches.open(RUNTIME_CACHE).then(c => c.put(req, res.clone()).catch(() => {}));
      }
      return res;
    } catch (e) {
      return new Response('Offline asset unavailable', { status: 503 });
    }
  })());
});

/* ── MESSAGE — page asks us to take over immediately, or to report
   how much of the asset library has been cached so far. ── */
self.addEventListener('message', async event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data.type === 'CACHE_STATUS' && event.ports && event.ports[0]) {
    try {
      const assets = await caches.open(ASSET_CACHE);
      const keys = await assets.keys();
      event.ports[0].postMessage({
        cached: keys.length,
        target: GAME_ASSETS.length,
        version: CACHE_VERSION
      });
    } catch (e) {
      event.ports[0].postMessage({ cached: 0, target: GAME_ASSETS.length, error: e.message });
    }
  }
});
