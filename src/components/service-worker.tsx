"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Registers the offline service worker. Production only — in development
 * the worker would serve stale pages over the dev server.
 */
export function ServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check for updates periodically (every 60 minutes).
        setInterval(() => reg.update(), 60 * 60 * 1000);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — prompt the user.
              setUpdateAvailable(true);
            }
          });
        });

        // Precache the page's own assets when idle (current page only, no background precache of all routes).
        const cacheUrls = (r: ServiceWorkerRegistration) => {
          const urls = [
            location.href,
            ...[...document.documentElement.outerHTML.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)].map(
              (m) => m[1],
            ),
          ];
          r.active?.postMessage({ type: "cache-urls", urls });
        };

        navigator.serviceWorker.ready.then((r) => {
          const idle =
            window.requestIdleCallback?.bind(window) ??
            ((cb: () => void) => setTimeout(cb, 2000));
          idle(() => cacheUrls(r));
        });
      })
      .catch(() => {
        // Offline support is a bonus; the app works without it.
      });

    // Reload when the new worker takes control.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    return () => {};
  }, []);

  useEffect(() => {
    if (!updateAvailable) return;
    toast("A new version of Devly is available.", {
      duration: Infinity,
      action: {
        label: "Reload",
        onClick: () => {
          navigator.serviceWorker.ready.then((reg) => {
            reg.waiting?.postMessage({ type: "skip-waiting" });
          });
        },
      },
    });
  }, [updateAvailable]);

  return null;
}
