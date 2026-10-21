"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker. Production only — in development
 * the worker would serve stale pages over the dev server.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Cache the current page: its first load happened before the
        // worker took control, so it was never intercepted.
        reg.active?.postMessage({ type: "cache-url", url: location.href });
      })
      .catch(() => {
        // Offline support is a bonus; the app works without it.
      });
  }, []);
  return null;
}
