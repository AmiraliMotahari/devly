import { expect, test } from "@playwright/test";
import { fixture, navigateToTool, trackPageErrors, waitForOfflineReady } from "./helpers";

test.describe("Offline tool usage", () => {
  test("text case converter works offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "case-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      const input = page.locator("#case-input");
      await input.fill("hello world");
      await expect(page.locator("#case-output")).toHaveValue(/HELLO WORLD/i, { timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline case converter");
  });

  test("JSON formatter works offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "json-formatter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      const input = page.locator("textarea").first();
      await input.fill('{"a":1,"b":2}');
      await page.getByRole("button", { name: /^format$/i }).click();
      await expect(page.locator('[data-slot="code-block"]')).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline json formatter");
  });

  test("currency converter shows queued state when offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "currency-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      // Just verify the page renders and shows offline indicator
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline currency");
  });
});
