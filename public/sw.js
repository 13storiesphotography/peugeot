/* Peugeot Control — lightweight offline shell */
const CACHE = "e3008-shell-v4";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

const OFFLINE_HTML = `<!doctype html><html lang=de><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name=theme-color content="#071018"><title>Peugeot Control</title><body style="margin:0;background:#071018;color:#eef6f8;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100dvh"><div style="text-align:center;padding:2rem"><p style="font-size:1.25rem;font-weight:600;letter-spacing:-0.02em">Peugeot Control</p><p style="opacity:.7;margin-top:.75rem;font-size:.9rem">Verbinde…</p></div></body></html>`;

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

  // Navigations: stale-while-revalidate so cold PWA opens paint immediately
  // from the last /control shell instead of waiting on auth/network TTFB.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached =
          (await cache.match(req)) ||
          (await cache.match("/control")) ||
          (await cache.match("/"));

        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              void cache.put(req, res.clone());
              if (url.pathname === "/control" || url.pathname.startsWith("/control/")) {
                void cache.put("/control", res.clone());
              }
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }

        const network = await networkPromise;
        if (network) return network;

        return new Response(OFFLINE_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })(),
    );
    return;
  }

  // Static icons / assets: cache first.
  if (
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/splash/") ||
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
