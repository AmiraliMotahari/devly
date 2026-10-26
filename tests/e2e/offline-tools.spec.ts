import { expect, test } from "@playwright/test";
import { fixture, navigateToTool, trackPageErrors, waitForOfflineReady } from "./helpers";

test.describe("Offline tool usage", () => {
  test("text case converter works offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "case-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      const input = page.locator("textarea, input[type='text']").first();
      await input.fill("hello world");
      await page.getByRole("button", { name: /convert|uppercase/i }).first().click();
      await expect(page.getByText(/HELLO WORLD/i)).toBeVisible({ timeout: 10_000 });
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
      await page.getByRole("button", { name: /format/i }).first().click();
      await expect(page.getByText(/"a": 1/)).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline json formatter");
  });

  test("hash generator works offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "checksum-generator");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.txt"));
      await page.getByRole("button", { name: /generate/i }).first().click();
      await expect(page.getByText(/e3b0c442/i)).toBeVisible({ timeout: 15_000 });
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline hash generator");
  });

  test("currency converter shows queued state when offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "currency-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      // Trigger a rate load by changing base currency
      const baseSelect = page.locator("select, [role='combobox']").first();
      if (await baseSelect.isVisible().catch(() => false)) {
        await baseSelect.click();
        await page.getByText("EUR").first().click();
      }
      await expect(page.getByTestId("currency-offline-queue")).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline currency");
  });
});
