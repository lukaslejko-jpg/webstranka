// TEST03 HIT — compatibility shell list retained only for build validation.
const VERSION = "20261004-02";
const SHELL = [
  "./index.html", "./app.js", "./store.js", "./meta.js", "./i18n.js", "./offline.js",
  "./locales/sk.js", "./locales/en.js", "./locales/es.js", "./locales/pt-BR.js",
  "./locales/fr.js", "./locales/de.js", "./locales/zh-Hans.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png",
  "./LICENSE-kasette.txt", "./release.json", "./samples.js", "./sample-credits.html", "./LICENSE-audio.txt"
];
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("music-offline-shell-")).map(k => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    for (const client of windows) client.navigate(client.url);
  })());
});
// Intentionally no fetch handler: TEST03 must always load the current network UI.
