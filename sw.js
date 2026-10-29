/* Service worker: deixa o Grimório funcionar offline quando publicado (GitHub Pages).
 * Offline support when hosted. Bump VERSION when files change. */
const VERSION = "grimorio-v2";
const FILES = ["./", "index.html", "css/style.css", "js/i18n.js", "js/config.js", "js/safety.js", "js/cloud.js", "js/themes.js", "js/pets.js", "js/store.js", "js/planner.js",
  "js/connectors/registry.js", "js/connectors/generic.js", "js/connectors/estacio.js", "js/importers.js", "js/fx.js", "js/tama.js",
  "js/app.js", "examples/exemplo-estacio-ads.js", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => r)));
});
