import { expect, test } from "@playwright/test";
import { navigateToTool, trackPageErrors } from "./helpers";

/**
 * PWA contract: the manifest must be installable (every icon resolves)
 * and the offline service worker must register.
 */
test.describe("PWA", () => {
  test("manifest is installable — icons resolve and required fields are set", async ({
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
        // The document itself — the offline reload needs exactly this.
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

  test("the app shell works offline (precached assets hydrate)", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Wait for the worker to install and precache the shell.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
      timeout: 20_000,
    });
    await page.waitForFunction(
      async () => {
        const keys = await caches.keys();
        if (keys.length === 0) return false;
        const cache = await caches.open(keys[0]);
        // The document and its JS are precached, not just its HTML.
        const entries = await cache.keys();
        return (
          (await cache.match(location.href)) !== undefined &&
          entries.some((r) => r.url.includes("/_next/static/chunks/"))
        );
      },
      { timeout: 20_000 },
    );

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 20_000,
      });
      // Hydration works offline: the theme toggle is a client-only control.
      const toggle = page.getByRole("button", { name: "Toggle theme" });
      await expect(toggle).toBeVisible();
      await toggle.click();
      await page.getByRole("menuitem", { name: "Dark" }).click();
      await expect
        .poll(async () => page.locator("html").getAttribute("class"))
        .toContain("dark");
    } finally {
      await context.setOffline(false);
    }
  });
});
