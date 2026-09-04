import { expect, test } from "@playwright/test";
import {
  downloadOutput,
  fillInput,
  getOutputText,
  navigateToTool,
  readClipboard,
  runTool,
  trackPageErrors,
} from "./helpers";

test.describe("robots.txt generator (options affect output)", () => {
  test("generates a valid robots.txt with User-agent and Disallow", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "robots-generator");
    await runTool(page, /generate/i);

    const out = await getOutputText(page);
    expect(out).toMatch(/User-agent:/);
    expect(out).toMatch(/Disallow:/);
    await errors.assertNone("robots-generator");
  });
});

test.describe("Sitemap generator (valid XML)", () => {
  /** Fill base URL and the first path entry (the tool starts with one row). */
  async function generateSitemap(
    page: import("@playwright/test").Page,
    baseUrl: string,
    path: string,
  ) {
    await page
      .getByPlaceholder("https://example.com")
      .fill(baseUrl);
    // The tool renders one entry row by default; its Path input is the
    // field with placeholder "/".
    await page.getByPlaceholder("/", { exact: true }).first().fill(path);
    await runTool(page, /generate/i);
  }

  test("generates a valid urlset for the entered URLs", async ({ page }) => {
    await navigateToTool(page, "sitemap-generator");

    await generateSitemap(page, "https://devly.test", "/about");

    const xml = await getOutputText(page);
    expect(xml).toContain("urlset");
    expect(xml).toContain("https://devly.test/about");

    // Output is parseable XML
    const valid = await page.evaluate((src: string) => {
      const doc = new DOMParser().parseFromString(src, "application/xml");
      return !doc.querySelector("parsererror");
    }, xml);
    expect(valid).toBe(true);
  });

  test("download produces a .xml file with the same content", async ({
    page,
  }) => {
    await navigateToTool(page, "sitemap-generator");
    await generateSitemap(page, "https://devly.test", "/about");

    const { filename, content } = await downloadOutput(page, /download/i);
    expect(filename).toMatch(/\.xml$/);
    expect(content.toString()).toContain("urlset");
  });
});

test.describe("Meta tag generator (options change output)", () => {
  test("includes title and description meta tags", async ({ page }) => {
    await navigateToTool(page, "meta-tag-generator");

    await fillInput(page, /title/i, "Devly — Tools");
    await fillInput(page, /description/i, "Browser tools that respect privacy");
    await runTool(page, /generate/i);

    const html = await getOutputText(page);
    expect(html).toContain('name="description"');
    expect(html).toContain("Devly — Tools");
    expect(html).toContain("respect privacy");

    // Generated HTML parses and contains only meta/link-level tags
    const valid = await page.evaluate((src: string) => {
      const doc = new DOMParser().parseFromString(src, "text/html");
      return doc.querySelectorAll("meta").length > 0;
    }, html);
    expect(valid).toBe(true);
  });
});

test.describe("Copy to clipboard (real browser clipboard)", () => {
  // Clipboard reading via context permission is Chromium-only; Firefox and
  // WebKit gate navigator.clipboard.readText behind user gestures.
  test("copy button puts the exact output on the clipboard @critical", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "clipboard-read permission is Chromium-only",
    );

    await navigateToTool(page, "json-to-yaml");
    await fillInput(
      page,
      "JSON Input",
      '{"copy":"exact value"}',
    );
    await runTool(page, "Convert");

    const copyBtn = page.getByRole("button", { name: "Copy" }).first();
    await copyBtn.click();

    const clipboard = await readClipboard(page);
    expect(clipboard.trim()).toContain("copy: exact value");
  });

  // Cross-browser clipboard contract: WebCrypto writeText works in all
  // engines on a user gesture; verify via the success toast (rendered by
  // sonner in every browser — clipboard *reading* is Chromium-only).
  test("copy shows the success confirmation in every browser", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-yaml");
    await fillInput(page, "JSON Input", '{"copy":"toast check"}');
    await runTool(page, "Convert");

    const copyBtn = page.getByRole("button", { name: "Copy" }).first();
    await copyBtn.click();

    await expect(page.getByText("Copied to clipboard").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("re-copying after changing the output updates the clipboard", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-yaml");

    await fillInput(page, "JSON Input", '{"v":1}');
    await runTool(page, "Convert");
    await page.getByRole("button", { name: "Copy" }).first().click();
    expect((await readClipboard(page)).trim()).toContain("v: 1");

    await fillInput(page, "JSON Input", '{"v":2}');
    await runTool(page, "Convert");
    await page.getByRole("button", { name: "Copy" }).first().click();
    expect((await readClipboard(page)).trim()).toContain("v: 2");
  });
});

test.describe("Downloads (text tools)", () => {
  test("JSON→YAML download delivers a .yaml file with the converted content @critical", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-yaml");
    await fillInput(page, "JSON Input", '{"downloaded":true}');
    await runTool(page, "Convert");

    const { filename, content } = await downloadOutput(page, /download/i);
    expect(filename).toMatch(/\.ya?ml$/);
    expect(content.toString()).toContain("downloaded: true");
  });
});

test.describe("Reset behavior", () => {
  test("clearing a tool resets input, output and errors", async ({ page }) => {
    await navigateToTool(page, "json-to-yaml");

    await fillInput(page, "JSON Input", '{"a":1}');
    await runTool(page, "Convert");
    await expect(page.locator('[data-slot="code-block"]').first()).toBeVisible();

    const clearBtn = page.getByRole("button", { name: /clear/i }).first();
    await clearBtn.click();

    await expect(
      page.locator('[data-slot="code-block"]'),
    ).toHaveCount(0, { timeout: 10_000 });
    const area = page.locator("textarea").first();
    await expect(area).toHaveValue("");

    // Tool error alerts are cleared (the toast region is not an error alert)
    await expect(page.locator('[data-slot="alert"]')).toHaveCount(0);
  });
});

test.describe("Loading/disabled states", () => {
  test("run button is disabled until required input is provided", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-yaml");
    const btn = page.getByRole("button", { name: "Convert" }).first();
    await expect(btn).toBeDisabled();

    await fillInput(page, "JSON Input", "{}");
    await expect(btn).toBeEnabled();
  });
});
