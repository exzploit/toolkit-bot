/* Toolkit service worker — cache the app shell for instant, offline-capable loads.
   Never caches /api/* or /telegram/* (those must always hit the network). */
const CACHE = "toolkit-v5.1";
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js",
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Always go to network for API and webhook — never serve stale.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/telegram/")) return;

  // Stale-while-revalidate for everything else.
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && (url.origin === location.origin || SHELL.includes(e.request.url))) {
          cache.put(e.request, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
