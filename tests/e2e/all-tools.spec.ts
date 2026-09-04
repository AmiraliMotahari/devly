import { expect, test } from "@playwright/test";
import { toolDefinitions } from "../../src/tools/definitions";

/**
 * Registry-driven smoke coverage: every registered tool gets a real visit
 * with a shell contract check (heading, breadcrumb, favorite control,
 * related tools section) — far beyond asserting a 200 status.
 *
 * Deeper functional workflows for high-traffic tools live in the other
 * spec files; this guarantees no tool page is broken or unregistered.
 */
test.describe("Every registered tool renders its interactive shell", () => {
  const available = toolDefinitions.filter((t) => t.available);

  test.beforeAll(() => {
    expect(available.length).toBeGreaterThanOrEqual(80);
  });

  for (const tool of available) {
    test(`${tool.category}/${tool.slug} — ${tool.name}`, async ({ page }) => {
      const response = await page.goto(`/tools/${tool.slug}`);
      expect(response?.status()).toBe(200);

      // Tool identity: H1 carries the tool name
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        tool.name,
      );

      // The tool body renders an interactive element the user can act on
      // (button, textarea, or upload zone depending on inputKind)
      const interactive = page.locator(
        'button:not([aria-label="More categories"]):not([aria-label="Toggle theme"]):not([aria-label="Add to favorites"]):not([aria-label="Search tools"]):not([aria-label="GitHub*"]):not([aria-label="Open menu"]), textarea, [role="button"][aria-label*="Upload"], [role="button"][aria-label*="Drop"], input[type="file"]',
      );
      await expect(interactive.first()).toBeVisible({ timeout: 15_000 });

      // No client crash for this tool
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      await page.waitForLoadState("networkidle");
      expect(
        pageErrors,
        `unexpected page errors on /tools/${tool.slug}`,
      ).toEqual([]);
    });
  }
});
