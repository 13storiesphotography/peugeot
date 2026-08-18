/* E-3008 Control — lightweight offline shell */
const CACHE = "e3008-shell-v3";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated API — client keeps last snapshot in localStorage.
  if (url.pathname.startsWith("/api/")) return;

  // App shell / navigations: network first, fall back to cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const control = await caches.match("/control");
          if (control) return control;
          return new Response(
            "<!doctype html><html lang=de><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>E-3008 Offline</title><body style=\"margin:0;background:#071018;color:#eef6f8;font-family:system-ui;display:grid;place-items:center;min-height:100dvh\"><div style=\"text-align:center;padding:2rem\"><p style=\"font-size:1.25rem;font-weight:600\">Offline</p><p style=\"opacity:.7;margin-top:.5rem\">Kein Netz — letzter Stand erscheint beim nächsten Besuch, sobald /control gecacht ist.</p></div></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  // Static icons / assets: cache first.
  if (
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            void caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
