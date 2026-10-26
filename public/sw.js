/**
 * Devly service worker — makes the app load without a network.
 *
 * Network-first: a fresh response always wins and is cached, the cache is
 * used only when the network fails. That keeps the app fresh online and
 * usable offline (visited pages, their RSC payloads and static assets).
 *
 * Cache name includes a build version so old caches are evicted on deploy.
 * The version is injected at build time by scripts/build-sw.mjs.
 */
const CACHE_VERSION = "v6";
const RUNTIME_CACHE = `devly-runtime-${CACHE_VERSION}`;
const SHELL_CACHE = `devly-shell-${CACHE_VERSION}`;
const MAX_RUNTIME_ENTRIES = 200;

self.addEventListener("install", (event) => {
  // Precache only the offline fallback page (tiny) so it's always available.
  // All other precaching is opt-in via "Download for offline".
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add("/offline").catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.includes(CACHE_VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// The page asks the worker to cache URLs. Only triggered by explicit
// user action ("Download for offline") — no background precaching.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (let i = 0; i < data.urls.length; i += 4) {
        await Promise.allSettled(
          data.urls.slice(i, i + 4).map((url) =>
            cache.add(url).catch(() => {
              /* a single missing asset must not fail the batch */
            }),
          ),
        );
        // Report progress back to the page
        const progress = Math.round(((i + 4) / data.urls.length) * 100);
        self.clients.matchAll().then((clients) => {
          clients.forEach((c) =>
            c.postMessage({ type: "precache-progress", percent: Math.min(progress, 100) }),
          );
        });
      }
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "precache-done" }));
      });
    }),
  );
});

// Single-URL cache (for the page's own first load).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-url" || typeof event.data.url !== "string") {
    return;
  }
  event.waitUntil(
    caches.open(RUNTIME_CACHE).then((cache) => cache.add(event.data.url)),
  );
});

// LRU eviction helper.
async function evictIfNeeded(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_RUNTIME_ENTRIES) return;
  // Evict oldest entries (FIFO approximates LRU for simplicity).
  const toEvict = keys.length - MAX_RUNTIME_ENTRIES;
  for (let i = 0; i < toEvict; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR / dev endpoints.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // For static assets, serve from cache if available; if not cached,
  // reject (network error) instead of returning 503 — a 503 response
  // causes ChunkLoadError in Turbopack/Next.js. A network error is
  // handled gracefully by the chunk loader (retry/error boundary).
  const isStaticAsset = url.pathname.startsWith("/_next/static/");

  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(async (cache) => {
            await cache.put(request, copy);
            await evictIfNeeded(cache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try runtime cache first, then shell cache.
        const cached =
          (await caches.match(request, { cacheName: RUNTIME_CACHE })) ||
          (await caches.match(request, { cacheName: SHELL_CACHE }));
        if (cached) return cached;
        // For static assets not in cache, return 404 instead of 503 or
        // a rejected promise — a 404 is handled gracefully by Next.js's
        // chunk loader (shows error boundary) instead of crashing with
        // ChunkLoadError.
        if (isStaticAsset) {
          return new Response("", { status: 404, statusText: "Not Found" });
        }
        // For navigation requests to uncached routes, serve the branded
        // offline page.
        if (request.mode === "navigate") {
          const offline = await caches.match("/offline");
          if (offline) return offline;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }),
  );
});

// Allow the page to trigger skipWaiting (after user confirms update).
self.addEventListener("message", (event) => {
  if (event.data?.type === "skip-waiting") {
    self.skipWaiting();
  }
});
