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
        // The document must be cached (via network-first on first load).
        return (await cache.match(location.href)) !== undefined;
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

test.describe("PWA — download for offline", () => {
  test("download button is visible in header", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /offline/i })).toBeVisible({ timeout: 10_000 });
    await errors.assertNone("download button");
  });

  test("download completes and shows ready state", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    const btn = page.getByRole("button", { name: /offline/i }).first();
    await btn.click();
    // Wait for completion (generous timeout for 92 URLs)
    await expect(page.getByRole("button", { name: /offline ready/i })).toBeVisible({
      timeout: 90_000,
    });
    await errors.assertNone("download flow");
  });
});

test.describe("PWA — network status", () => {
  test("offline pill appears when network is down", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await expect(page.getByText("Offline")).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
  });

  test("back online pill appears on reconnect", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await expect(page.getByText("Back online")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("PWA — offline fallback", () => {
  test("uncached route shows branded offline page", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await page.goto("/tools/this-tool-does-not-exist");
      await expect(page.getByText(/you're offline/i)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});

test.describe("PWA — install prompt", () => {
  test("iOS shows Add to Home Screen instructions", async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByText(/add to home screen/i)).toBeVisible({ timeout: 10_000 });
    await context.close();
  });

  test("install button hidden when already installed", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("devly:installed", "1");
    });
    await page.reload();
    await expect(page.getByRole("button", { name: /install devly/i })).not.toBeVisible();
  });
});
