/* Family Finance — service worker
   Estratégia: rede primeiro (o app nunca fica preso numa versão antiga),
   com cache como reserva para funcionar offline. */

const CACHE = "family-finance-v9";
const SHELL = [
  "./",
  "index.html",
  "css/styles.css?v=9",
  "js/app.js?v=9",
  "js/vendor/supabase.js?v=9",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: req.mode === "navigate" })
          .then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html", { ignoreSearch: true }) : undefined))
      )
  );
});
