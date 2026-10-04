// Music Offline shell. User audio is stored separately in IndexedDB.
// Cache deletion is deliberately limited to this application's prefix.
const VERSION = "20261004-01";
const CACHE_PREFIX = "music-offline-shell-";
const CACHE = CACHE_PREFIX + VERSION;
const SHELL = [
  "./index.html", "./app.js", "./store.js", "./meta.js", "./i18n.js", "./offline.js",
  "./locales/sk.js", "./locales/en.js", "./locales/es.js", "./locales/pt-BR.js",
  "./locales/fr.js", "./locales/de.js", "./locales/zh-Hans.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png",
  "./LICENSE-kasette.txt", "./release.json",
];
const base = new URL("./", self.location.href);
const indexURL = new URL("./index.html", base).href;

self.addEventListener("install", event => {
  // addAll rejects an incomplete shell: do not advertise a partial install.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isAppPage = request.mode === "navigate" && (url.pathname === base.pathname || url.pathname === new URL(indexURL).pathname);
    const cached = await cache.match(isAppPage ? indexURL : request, { ignoreSearch: true });
    return cached || fetch(request);
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "MUSIC_OFFLINE_STATUS" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const entries = await Promise.all(SHELL.map(path => cache.match(new URL(path, base).href)));
    event.ports[0].postMessage({ type: "MUSIC_OFFLINE_STATUS", version: VERSION, ready: entries.every(Boolean), assets: entries.filter(Boolean).length });
  })());
});
