/* Service worker: deixa o Grimório funcionar offline quando publicado (GitHub Pages).
 * Offline support when hosted. Bump VERSION when files change. */
const VERSION = "grimorio-v16";
const FILES = ["./", "index.html", "css/style.css", "js/i18n.js", "js/config.js", "js/safety.js", "js/vault.js", "js/cloud.js", "js/push.js", "js/themes.js", "js/pets.js", "js/store.js", "js/planner.js", "js/activities.js",
  "js/connectors/registry.js", "js/connectors/generic.js", "js/connectors/estacio.js", "js/importers.js", "js/fx.js", "js/tama.js",
  "js/app.js", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Rede primeiro (pega sempre a versão mais nova); cache só quando estiver offline.
// Network first (always the newest version); cache only as offline fallback.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  if (!sameOrigin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match(e.request)));
});

// Avisos com o app fechado / push notifications
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: "☾ Grimório ☽", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "☾ Grimório ☽", { body: d.body || "", tag: d.tag, icon: "assets/icon-192.png", badge: "assets/icon-192.png", data: { url: "./index.html" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./index.html");
  }));
});
