import { expect, test } from "@playwright/test";
import { navigateToTool, trackPageErrors } from "./helpers";

/**
 * PWA contract: the manifest must be installable (every icon resolves)
 * and the offline service worker must register.
 */
test.describe("PWA", () => {
  test("manifest is installable — icons resolve and required fields are set", async ({
    page,
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as {
      name: string;
      start_url?: string;
      scope?: string;
      display?: string;
      icons: { src: string; sizes: string; type: string }[];
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Every icon must actually exist — a manifest with dead icon paths
    // makes the app uninstallable.
    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `icon ${icon.src} must resolve`).toBe(200);
      expect(icon.type).toBe("image/png");
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
    }
  });

  test("offline service worker registers", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");

    // The worker registers in production builds (the e2e rig runs one).
    const registered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? "registered" : "none";
    });
    expect(registered).toBe("registered");
    await errors.assertNone("pwa service worker");
  });

  test("the app loads with the network off (served by the worker cache)", async ({
    page,
    context,
  }) => {
    await navigateToTool(page, "advanced-image-editor");

    // Wait for the worker to take control and to have cached this page
    // (its first load happened before the worker was in charge).
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
      timeout: 20_000,
    });
    await page.waitForFunction(
      async () => {
        const keys = await caches.keys();
        if (keys.length === 0) return false;
        const cache = await caches.open(keys[0]);
        return (await cache.match(location.href)) !== undefined;
      },
      { timeout: 20_000 },
    );

    await context.setOffline(true);
    try {
      await page.reload();
      // The page still renders — the worker answers from its cache.
      await expect(page.getByTestId("tool-title")).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await context.setOffline(false);
    }
  });
});
