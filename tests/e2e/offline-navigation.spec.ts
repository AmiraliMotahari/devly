import { expect, test } from "@playwright/test";
import { navigateToTool, trackPageErrors, waitForOfflineReady } from "./helpers";

test.describe("Offline navigation", () => {
  test("navigate between cached pages while offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await navigateToTool(page, "json-formatter");
    await navigateToTool(page, "case-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      // Go back to home
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Navigate to a visited tool
      await page.goto("/tools/json-formatter");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Navigate to another visited tool
      await page.goto("/tools/case-converter");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline navigation");
  });

  test("browser back/forward works offline", async ({ page, context }) => {
    await page.goto("/");
    await navigateToTool(page, "json-formatter");
    await navigateToTool(page, "case-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await page.goBack();
      await expect(page).toHaveURL(/json-formatter/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await page.goForward();
      await expect(page).toHaveURL(/case-converter/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test("uncached route shows branded offline fallback", async ({ page, context }) => {
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

  test("offline fallback retry button reloads when back online", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    await page.goto("/tools/this-tool-does-not-exist");
    await expect(page.getByText(/you're offline/i)).toBeVisible({ timeout: 10_000 });

    await context.setOffline(false);
    await page.getByRole("button", { name: /try again/i }).click();
    // Should navigate (may show 404 or redirect, but shouldn't crash)
    await page.waitForLoadState("domcontentloaded");
  });

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
});
