/* ═════════════════════════════════════════════════════════════════
   Gulsabi Games — Service Worker
   Bump CACHE_VERSION on every deploy that should invalidate caches.
   ───────────────────────────────────────────────────────────────── */
const CACHE_VERSION = 'gulsabi-v1';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/* Core app shell — must be cached on install for offline to work */
const CORE_URLS = [
  './',
  'index.html',
  'about.html',
  'games.html',
  'manifest.json',
  'images/gulsabi-logo.png',
  'assets/game1.svg',
  'assets/game2.svg',
  'assets/game3.svg',
  'assets/game4.svg',
  'assets/game5.svg',
  // game 1
  'games/game1/index.html',
  'games/game1/gulsabi-game-fly.png',
  'games/game1/unicorn-powerup.svg',
  'games/game1/audio/gulsabi_chant.mp3',
  'games/game1/audio/invincible.mp3',
  'games/game1/audio/jetpack.mp3',
  'games/game1/audio/level_up.mp3',
  // game 2 (shared sprites + audio + 80 card images used by games 3/4/5 too)
  'games/game2/index.html',
  'games/game2/gulsabi-normal.png',
  'games/game2/gulsabi-happy.png',
  'games/game2/gulsabi-sad.png',
  'games/game2/gulsabi-thinking.png',
  'games/game2/audio/v_start.mp3',
  'games/game2/audio/v_time_low.mp3',
  'games/game2/audio/v_gameover.mp3',
  'games/game2/audio/v_win.mp3',
  'games/game2/audio/v_powerup.mp3',
  'games/game2/audio/oops.mp3',
  // games 3, 4, 5
  'games/game3/index.html',
  'games/game4/index.html',
  'games/game5/index.html'
];

/* The 80 colour-themed card images used by games 2, 3, 4, 5 */
const CARD_IMAGES = [
  'blue-Jeans.jpg','blue-bird.jpg','blue-blueberry.jpg','blue-bluewhale.jpg','blue-butterfly.jpg','blue-crayon.jpg','blue-diamond.jpg','blue-fish.jpg','blue-peacock.jpg','blue-water.jpg',
  'brown-baseball.jpg','brown-biscut.jpg','brown-box.jpg','brown-bread.jpg','brown-chocolate.jpg','brown-coconut.jpg','brown-monkey.jpg','brown-potato.jpg','brown-teddy.jpg','brown-woodlog.jpg',
  'green-ball.jpg','green-brocolli.jpg','green-cactus.jpg','green-cucumber.jpg','green-diamond.jpg','green-frog.jpg','green-grasshopper.jpg','green-leaf.jpg','green-lemon.jpg','green-turtle.jpg',
  'orange-basketball.jpg','orange-butterfly.jpg','orange-carrot.jpg','orange-cone.jpg','orange-fish.jpg','orange-flower.jpg','orange-fox.jpg','orange-orange.jpg','orange-pumpkin.jpg','orange-tiger.jpg',
  'pink-brain.jpg','pink-cottoncandy.jpg','pink-doughnut.jpg','pink-eraser.jpg','pink-flamingo.jpg','pink-lotus.jpg','pink-peach.jpg','pink-pig.jpg','pink-ribbon.jpg','pink-shoe.jpg',
  'purple-beetroot.jpg','purple-brinjal.jpg','purple-crayon.jpg','purple-crystal.jpg','purple-fig.jpg','purple-flower.jpg','purple-grapes.jpg','purple-octopus.jpg','purple-plant.jpg','purple-plum.jpg',
  'red-apple.jpg','red-baloon.jpg','red-button.jpg','red-car.jpg','red-chilli.jpg','red-crab.jpg','red-grapes.jpg','red-heart.jpg','red-rose.jpg','red-tomato.jpg',
  'yellow-banana.jpg','yellow-bus.jpg','yellow-cap.jpg','yellow-cheese.jpg','yellow-corn.jpg','yellow-duck.jpg','yellow-lemon.jpg','yellow-sun.jpg','yellow-sunflower.jpg','yellow-taxi.jpg'
].map(f => `games/game2/assets/${f}`);

/* ── INSTALL ── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Core install must succeed
    await cache.addAll(CORE_URLS);
    // Card images are large but important for offline play — best effort
    await Promise.allSettled(CARD_IMAGES.map(url =>
      cache.add(url).catch(() => null)
    ));
  })());
});

/* ── ACTIVATE — drop old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CORE_CACHE && k !== RUNTIME_CACHE).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* ── FETCH ──
   - Navigation (HTML): network-first so updates show when online; cache fallback offline.
   - Other GETs: cache-first with background refresh.
*/
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  // Don't intercept analytics or other origins we can't reliably cache (except fonts).
  if(url.origin !== self.location.origin && !url.host.includes('fonts.googleapis.com') && !url.host.includes('fonts.gstatic.com')){
    return;
  }

  const isNav = req.mode === 'navigate' || (req.destination === 'document');

  if(isNav){
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CORE_CACHE);
        cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        if(cached) return cached;
        // Last-resort: serve games.html from cache
        return (await caches.match('games.html')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Cache-first for static assets
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if(cached){
      // Background refresh (don't block the response)
      fetch(req).then(res => {
        if(res && res.ok){
          caches.open(RUNTIME_CACHE).then(c => c.put(req, res.clone()).catch(()=>{}));
        }
      }).catch(()=>{});
      return cached;
    }
    try {
      const res = await fetch(req);
      if(res && res.ok){
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, res.clone()).catch(()=>{});
      }
      return res;
    } catch (e) {
      return new Response('Offline asset unavailable', { status: 503 });
    }
  })());
});

/* ── MESSAGE — skip waiting on user-triggered update ── */
self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});
