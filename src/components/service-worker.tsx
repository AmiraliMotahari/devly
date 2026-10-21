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

    const cacheUrls = (reg: ServiceWorkerRegistration) => {
      // The page's own assets: the HTML lists them, so no build manifest
      // is needed. Done when the browser is idle so the precache never
      // competes with the page's own loading.
      const urls = [
        location.href,
        "/",
        "/manifest.webmanifest",
        ...[...document.documentElement.outerHTML.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)].map(
          (m) => m[1],
        ),
      ];
      reg.active?.postMessage({ type: "cache-urls", urls });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const idle =
          window.requestIdleCallback?.bind(window) ??
          ((cb: () => void) => setTimeout(cb, 2000));
        idle(() => cacheUrls(reg));
      })
      .catch(() => {
        // Offline support is a bonus; the app works without it.
      });
  }, []);
  return null;
}
