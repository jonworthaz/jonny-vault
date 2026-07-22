/* Base Reality service worker — precache the whole app so it runs fully offline once installed. */
const VERSION = 'br-v2';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'modules/csv-cleaner.js',
  'modules/prompt-vault.js',
  'modules/screenshot-beautifier.js',
  'modules/renewal-radar.js',
  'modules/quote-builder.js',
  'modules/pdf-toolkit.js',
  'vendor/pdf-lib.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache-first with background refresh: instant offline, quietly picks up new versions.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const refresh = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin)
          caches.open(VERSION).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || refresh;
    })
  );
});
