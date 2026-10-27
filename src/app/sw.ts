/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// When offline, RSC payload requests (?_rsc=) that aren't cached cause
// hydration mismatches and crashes. Reject them (network error) so React
// handles gracefully instead of hanging or crashing.
serwist.registerCapture(
  ({ request }) => {
    const url = new URL(request.url);
    return url.searchParams.has("_rsc");
  },
  async ({ request }) => {
    if (!navigator.onLine) {
      const cached = await caches.match(request);
      if (cached) return cached;
      return Promise.reject(new Error("offline"));
    }
    try {
      return await fetch(request);
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return Promise.reject(new Error("offline"));
    }
  },
);

serwist.addEventListeners();
