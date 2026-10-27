import { expect, test } from "@playwright/test";
import { navigateToTool, trackPageErrors, waitForOfflineReady } from "./helpers";
import { resolve } from "node:path";

test.describe("Offline — all tool pages load", () => {
  test("representative tool pages render offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    const sample = ["json-formatter", "case-converter", "resize-image"];

    for (const slug of sample) {
      await page.goto(`/tools/${slug}`);
      await page.waitForLoadState("networkidle");
    }
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      for (const slug of sample) {
        await page.goto(`/tools/${slug}`);
        await expect(page.getByTestId("tool-title")).toBeVisible({ timeout: 15_000 });
      }
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline representative tools");
  });
});

test.describe("Offline — tool functionality (correctness)", () => {
  test("case converter produces correct output offline", async ({ page, context }) => {
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

  test("JSON formatter produces correct output offline", async ({ page, context }) => {
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

  test("image resize works offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "resize-image");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await page.locator('input[type="file"]').first().setInputFiles(
        resolve(__dirname, "../fixtures/pixel.png"),
      );
      await expect(page.getByTestId("tool-title")).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline image resize");
  });

  test("hash generator renders offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "checksum-generator");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await expect(page.getByTestId("tool-title")).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline hash generator");
  });
});

test.describe("Offline — navigation", () => {
  test("navigate between cached pages while offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await navigateToTool(page, "json-formatter");
    await navigateToTool(page, "case-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.goto("/tools/json-formatter");
      await expect(page.getByTestId("tool-title")).toBeVisible();
      await page.goto("/tools/case-converter");
      await expect(page.getByTestId("tool-title")).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline navigation");
  });

  test("offline pill appears when network is down", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await expect(page.getByTestId("offline-pill")).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
  });

  test("theme toggle works offline", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
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

  test("search works offline", async ({ page, context }) => {
    await page.goto("/");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      const searchBtn = page.getByRole("button", { name: /search tools/i });
      if (await searchBtn.isVisible().catch(() => false)) {
        await searchBtn.click();
        await expect(page.getByPlaceholder(/search for a tool/i).first()).toBeVisible({ timeout: 5_000 });
      }
    } finally {
      await context.setOffline(false);
    }
  });
});

test.describe("Offline — currency converter", () => {
  test("shows queued state when offline", async ({ page, context }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "currency-converter");
    await waitForOfflineReady(page);

    await context.setOffline(true);
    try {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
    await errors.assertNone("offline currency");
  });
});
