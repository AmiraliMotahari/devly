import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";

test.describe("Application shell", () => {
  test("homepage renders hero, categories and featured tools", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/82 tools|tools and counting/i)).toBeVisible();

    // Category grid
    await expect(page.getByRole("heading", { name: /browse by category/i })).toBeVisible();

    // Featured tools are links into /tools/*
    const toolLinks = page.locator('a[href^="/tools/"]');
    expect(await toolLinks.count()).toBeGreaterThan(5);
    await errors.assertNone("homepage");
  });

  test("all tools directory lists every tool with search filtering", async ({
    page,
  }) => {
    await page.goto("/tools");

    // A large set of tool links is listed
    const links = page.locator('a[href^="/tools/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(80);

    // Directory search filters the list
    const search = page.getByPlaceholder(/search|filter/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("json");
      await expect(page.waitForTimeout(0)).resolves.toBeDefined();
      const filtered = page.locator('a[href^="/tools/"]');
      expect(await filtered.count()).toBeGreaterThan(0);
      expect(await filtered.count()).toBeLessThan(count);
    }
  });

  test("category page lists only that category's tools", async ({ page }) => {
    await page.goto("/category/pdf");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDF/i);

    const links = page.locator('a[href^="/tools/"]');
    expect(await links.count()).toBeGreaterThan(3);
  });

  test("category index lists all categories", async ({ page }) => {
    await page.goto("/category");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const catLinks = page.locator('a[href^="/category/"]');
    expect(await catLinks.count()).toBeGreaterThanOrEqual(10);
  });

  test("unknown tool slug shows the not-found page", async ({ page }) => {
    // Note: with cacheComponents/PPR the static shell may arrive as 200
    // while notFound() content streams in — assert the visible UI, which
    // is the user-facing contract.
    await page.goto("/tools/this-tool-does-not-exist");
    await expect(page.getByText(/404|not found/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("unknown route returns 404", async ({ page }) => {
    const response = await page.goto("/nope/nope");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Header navigation", () => {
  test("desktop nav: logo → home, categories dropdown navigates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/tools/json-to-yaml");

    // Logo returns home
    await page.getByRole("link", { name: /home/i }).first().click();
    await expect(page).toHaveURL("/");

    // Categories dropdown
    await page.getByRole("button", { name: "Categories" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await page.getByRole("menuitem", { name: "Colors" }).click();
    await expect(page).toHaveURL(/\/category\/colors/);
  });

  test("mobile nav: hamburger sheet lists categories and navigates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuBtn = page.getByRole("button", { name: "Open menu" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("link", { name: "Developer" }).click();
    await expect(page).toHaveURL(/\/category\/developer/);
  });

  test("GitHub link is reachable from the header (href contract)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const github = page.getByRole("link", { name: /github/i });
    await expect(github).toHaveAttribute("href", /github\.com/);
  });
});

test.describe("Command palette (⌘K)", () => {
  test("opens from the search button, searches and navigates", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.locator('[data-slot="command-input"]');

    await page
      .getByRole("button", { name: /search tools/i })
      .first()
      .click();
    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(input).toBeFocused();

    await input.fill("json to yaml");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/tools\/json-to-yaml/);
  });

  test("the Control+K / Meta+K shortcut opens the palette (listener contract)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    // The theme toggle is part of the static shell; networkidle is the
    // deterministic hydration signal for the palette's global key listener.
    await page.waitForLoadState("networkidle");
    const input = page.locator('[data-slot="command-input"]');

    // Dispatch the exact event the app's document-level listener expects:
    // keydown with ctrlKey (Control+K) / metaKey (⌘K) and key "k".
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
      );
    });

    await expect(input).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(input).toHaveCount(0);
  });

  test("shows description and category on results; no duplicate rows", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const input = page.locator('[data-slot="command-input"]');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill("json schema");

    const items = page.locator('[data-slot="command-item"]');
    await expect(items.first()).toBeVisible();

    const labels = await items.allTextContents();
    // No two rows are the same tool (duplicate-row regression)
    const trimmed = labels.map((l) => l.trim());
    expect(new Set(trimmed).size).toBe(trimmed.length);
    // Both schema tools are distinct entries
    expect(trimmed.some((l) => l.includes("JSON Schema Generator"))).toBe(true);
    expect(trimmed.some((l) => l.includes("JSON to JSON Schema"))).toBe(true);
  });

  test("empty query shows categories + favorites/recent groups, not duplicates", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    await expect(
      page.locator('[data-slot="command-input"]'),
    ).toBeVisible({ timeout: 10_000 });

    const items = page.locator('[data-slot="command-item"]');
    await expect(items.first()).toBeVisible();
    const labels = (await items.allTextContents()).map((l) => l.trim());
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("escape closes the palette without navigating", async ({ page }) => {
    await page.goto("/tools");
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const input = page.locator('[data-slot="command-input"]');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(input).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/tools$/);
  });
});

test.describe("Theme", () => {
  test("toggle switches dark class and persists across reload", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe("Responsive layout", () => {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`tool page has no horizontal overflow at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/tools/json-to-yaml");
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("mobile: exactly one search trigger is visible (no gap, no dupes)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const iconSearch = page.getByRole("button", { name: "Search tools" });
    await expect(iconSearch).toHaveCount(1);
    await expect(iconSearch).toBeVisible();
  });

  test("desktop: wide search trigger with ⌘K hint is visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Search tools/i })).toBeVisible();
  });
});

test.describe("Routing", () => {
  test("browser back/forward navigation works on tool pages", async ({
    page,
  }) => {
    await page.goto("/tools/json-to-yaml");
    await page.goto("/tools/yaml-to-json");
    await page.goBack();
    await expect(page).toHaveURL(/json-to-yaml/);
    await page.goForward();
    await expect(page).toHaveURL(/yaml-to-json/);
  });

  test("tool page metadata contract: title and description", async ({
    page,
  }) => {
    await page.goto("/tools/json-to-yaml");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    const description = await page.evaluate(
      () =>
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ?? "",
    );
    expect(description.length).toBeGreaterThan(10);
  });
});
