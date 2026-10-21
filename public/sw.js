/**
 * Devly service worker — makes the app load without a network.
 *
 * Network-first: a fresh response always wins and is cached, the cache is
 * used only when the network fails. That keeps the app fresh online and
 * usable offline (visited pages, their RSC payloads and static assets).
 *
 * The cache grows with every visited URL and is not size-capped; if that
 * becomes a problem, add a limit (LRU eviction) rather than switching to
 * cache-first, which would serve stale pages.
 */
const CACHE = "devly-v1";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// The page asks the worker to cache itself: the first load happened
// before the worker controlled the page, so it was never intercepted.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-url" || typeof event.data.url !== "string") {
    return;
  }
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(event.data.url)),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only same-origin, successful responses are cacheable.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }),
  );
});
