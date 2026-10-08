/* Peugeot Control — lightweight offline shell */
const CACHE = "e3008-shell-v5";
const PRECACHE = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/offline.html",
];

/** Same branded cover as AppBootSplash — last resort if offline.html missing. */
const OFFLINE_HTML = `<!doctype html><html lang=de><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name=theme-color content="#071018"><meta name=color-scheme content=dark><title>Peugeot Control</title><style>html,body{margin:0;min-height:100%;min-height:100dvh;background:#071018;color:#eef6f8;color-scheme:dark}#app-boot-splash{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#071018}.boot-copy{text-align:center;font-family:system-ui,-apple-system,sans-serif}.boot-label{font-size:13px;font-weight:700;letter-spacing:.36em;text-transform:uppercase;color:#5fe3c0;margin:0 0 0 -.36em}.boot-sub{margin-top:.7rem;font-size:13px;color:rgba(143,168,181,.9)}.boot-hint{margin-top:1.25rem;font-size:12px;color:rgba(143,168,181,.65)}</style><body><div id=app-boot-splash role=status><div class=boot-copy><div class=boot-label>Peugeot</div><div class=boot-sub>Kein Netz</div><div class=boot-hint>Tippen zum erneuten Versuch</div></div></div><script>document.getElementById("app-boot-splash").addEventListener("click",function(){location.reload()});window.addEventListener("online",function(){location.reload()},{once:true})</script></body></html>`;

/** Avoid leaving iOS on a blank white screen while fetch hangs offline. */
function fetchWithTimeout(req, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(req, { signal: ctrl.signal })
    .then((res) => res)
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

async function precacheShell(cache) {
  await cache.addAll(PRECACHE);
  // Best-effort: warm the last app shell so cold offline opens paint splash HTML.
  for (const path of ["/control", "/"]) {
    try {
      const res = await fetchWithTimeout(path, 4000);
      if (res && res.ok) {
        await cache.put(path, res.clone());
      }
    } catch {
      // ignore — offline.html covers first install without network
    }
  }
}

function offlineResponse(cache) {
  return cache.match("/offline.html").then(
    (cached) =>
      cached ||
      new Response(OFFLINE_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => precacheShell(cache))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
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

        // Offline shell itself — never wait on the network.
        if (url.pathname === "/offline.html") {
          return offlineResponse(cache);
        }

        const cached =
          (await cache.match(req)) ||
          (await cache.match("/control")) ||
          (await cache.match("/"));

        if (cached) {
          // Revalidate in background; never block first paint on the network.
          event.waitUntil(
            fetch(req)
              .then((res) => {
                if (res && res.ok) {
                  void cache.put(req, res.clone());
                  if (
                    url.pathname === "/control" ||
                    url.pathname.startsWith("/control/")
                  ) {
                    void cache.put("/control", res.clone());
                  }
                }
              })
              .catch(() => {}),
          );
          return cached;
        }

        // No shell yet: race a short timeout so offline cold starts get the
        // branded splash instead of a hanging white WebKit viewport.
        const network = await fetchWithTimeout(req, 1500);
        if (network && network.ok) {
          void cache.put(req, network.clone());
          if (
            url.pathname === "/control" ||
            url.pathname.startsWith("/control/")
          ) {
            void cache.put("/control", network.clone());
          }
          return network;
        }
        if (network) return network;

        return offlineResponse(cache);
      })(),
    );
    return;
  }

  // Static icons / assets: cache first.
  if (
    url.pathname.startsWith("/icon") ||
    url.pathname.startsWith("/splash/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/offline.html"
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
