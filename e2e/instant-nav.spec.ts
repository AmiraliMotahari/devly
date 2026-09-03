import { test, expect } from "@playwright/test";
import { instant } from "@next/playwright";

/**
 * Instant-navigation guards (Cache Components / PPR + Partial Prefetching).
 *
 * Tool and category routes have enumerable params (generateStaticParams) but
 * are still fallback routes, so a client navigation commits the destination's
 * loading shell instantly; the params-derived content streams in after. These
 * tests lock dynamic data with instant() and assert:
 *   1. the loading shell (skeleton) commits under the lock — non-blank
 *   2. the real content is gated under the lock and appears after release
 *
 * Rig: see instant-nav.rig.md. Build with EXPOSE_TESTING_API=1; the
 * gated-half assertions fail closed if the testing API is missing.
 */

test.describe("instant nav: home → tool page (soft)", () => {
  test("loading shell commits, content streams after release", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.locator('a[href="/tools/qr-code-generator"]').first();
    await expect(trigger).toBeVisible({ timeout: 20_000 });

    await instant(page, async () => {
      await trigger.click();
      await expect(page.getByTestId("tool-shell-skeleton")).toBeVisible();
      // gated: params-derived content must not be present under the lock
      await expect(page.getByTestId("tool-shell")).toHaveCount(0);
    });
    // after release the real shell streams in
    await expect(page.getByTestId("tool-shell")).toBeVisible();
    await expect(page.getByTestId("tool-title")).toContainText(
      "QR Code Generator",
    );
  });
});

test.describe("instant nav: tools directory (soft)", () => {
  test("directory page commits fully under the lock", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("link", { name: "Tools", exact: true });
    await expect(trigger).toBeVisible({ timeout: 20_000 });

    await instant(page, async () => {
      await trigger.click();
      // /tools is fully static — the whole page is the shell
      await expect(page.getByTestId("tools-title")).toBeVisible();
    });
  });
});

test.describe("instant nav: category page (soft)", () => {
  test("loading shell commits, content streams after release", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.locator('a[href="/category/developer"]').first();
    await expect(trigger).toBeVisible({ timeout: 20_000 });

    await instant(page, async () => {
      await trigger.click();
      await expect(page.getByTestId("category-loading")).toBeVisible();
      // gated: params-derived content must not be present under the lock
      await expect(page.getByTestId("category-shell")).toHaveCount(0);
    });
    // after release the real category page streams in
    await expect(page.getByTestId("category-shell")).toBeVisible();
    await expect(page.getByTestId("category-title")).toContainText(
      /Developer/i,
    );
  });
});

test.describe("instant initial load: tool page (hard)", () => {
  test("prerendered shell is served under the lock", async ({ page }) => {
    const url = "/tools/qr-code-generator";
    await instant(
      page,
      async () => {
        await page.goto(url);
        // The prerendered document for a fallback route serves its loading
        // shell; params-derived content is gated by the lock.
        await expect(
          page.getByTestId("tool-shell-skeleton").or(page.getByTestId("tool-shell")),
        ).toBeVisible();
      },
      { baseURL: process.env.BASE_URL ?? "http://localhost:3100" },
    );
  });
});
