/* Retro Hry – service worker: všetko uložené v telefóne, hry fungujú aj bez internetu. */
const CACHE = 'retrohry-v4';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/core.js',
  'js/lcd.js',
  'js/game-blocks.js',
  'js/game-racing.js',
  'js/brick-console.js',
  'js/game-eggs.js',
  'js/segscreen.js',
  'js/game-racer.js',
  'js/game-octopus.js',
  'js/game-battle.js',
  'js/app.js',
  'fonts/silkscreen-latin-400-normal.woff2',
  'fonts/silkscreen-latin-ext-400-normal.woff2',
  'fonts/silkscreen-latin-700-normal.woff2',
  'fonts/silkscreen-latin-ext-700-normal.woff2',
  'fonts/rubik-latin-400-normal.woff2',
  'fonts/rubik-latin-ext-400-normal.woff2',
  'fonts/rubik-latin-700-normal.woff2',
  'fonts/rubik-latin-ext-700-normal.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
