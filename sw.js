/* TypeFlow service worker — offline support.
   Network-first with cache fallback so updates are always picked up when
   online, and the app still works offline. */
const CACHE = "typeflow-v3";
const CORE = [
  "./",
  "index.html",
  "app.js",
  "style.css",
  "typing-data.js",
  "english-data.js",
  "words-db.js",
  "grammar-data.js",
  "audio.js",
  "manifest.json",
  "icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
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
  if (req.method !== "GET") return;
  // Only handle our own origin — never cache the CDN or the translation API.
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
