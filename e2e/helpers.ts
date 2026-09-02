import { expect, type Locator, type Page } from "@playwright/test";
import path from "node:path";

export const FIXTURES = path.resolve(__dirname, "../tests/fixtures");

export const fixture = (name: string) => path.join(FIXTURES, name);

/**
 * Collect unexpected page errors so tests can fail on real runtime crashes
 * while ignoring deliberate failure-path testing.
 */
export function trackPageErrors(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (err) => pageErrors.push(err));
  return {
    get errors() {
      return pageErrors;
    },
    async assertNone(testName: string) {
      expect
        .soft(pageErrors, `${testName}: unexpected pageerror(s)`)
        .toEqual([]);
    },
  };
}

/** Navigate to a tool page by slug and wait for the tool shell + hydration. */
export async function navigateToTool(page: Page, slug: string) {
  await page.goto(`/tools/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Wait for React hydration: the client-rendered header theme toggle must
  // be present and the page must not be in a "loading" state. Without this,
  // fill()/click() can land before event handlers are attached.
  await expect(
    page.getByRole("button", { name: "Toggle theme" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/**
 * Fill a labeled textarea/input (tool-forms ToolInput or a plain label),
 * then confirm React received the input by asserting a primary action
 * button left the disabled state.
 */
export async function fillInput(
  page: Page,
  label: string | RegExp,
  value: string,
) {
  const labelLocator =
    typeof label === "string"
      ? page.locator("label", { hasText: label }).first()
      : page.locator("label", { hasText: label }).first();
  const field = labelLocator
    .locator("xpath=..")
    .locator("textarea, input")
    .first();
  await field.fill(value);

  // Hydration/state guard: after filling a non-empty value, most tools'
  // primary action becomes enabled. If a button is present and still
  // disabled, retry the fill once (pre-hydration race).
  const primary = page
    .locator('button:not([data-size="sm"]):not([aria-haspopup])')
    .first();
  const primaryExists = await primary.isVisible().catch(() => false);
  if (primaryExists && value.length > 0) {
    try {
      await expect(primary).toBeEnabled({ timeout: 3_000 });
    } catch {
      // State didn't land (pre-hydration fill). Refill now that hydrated.
      await field.fill(value);
    }
  }
}

/** The primary action button (Convert / Run / Generate / …). */
export async function runTool(
  page: Page,
  labelPattern: RegExp | string = /^(Convert|Run|Generate|Create|Extract|Compress|Merge|Split|Rotate|Encrypt|Decrypt|Validate|Format|Minify|Encode|Decode|Parse|Clean|Sort|Analyze|Download|Build|Optimize)/i,
) {
  const options =
    typeof labelPattern === "string"
      ? { name: labelPattern, exact: true }
      : { name: labelPattern };
  // Prefer the full-size primary action; some tools also render small
  // (size="sm") mode-switch buttons with the same text.
  const btn = page
    .getByRole("button", options)
    .and(page.locator('button:not([data-size="sm"])'))
    .first();
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
  await btn.click();
  return btn;
}

/** Read the tool's output: CodeBlock or a readonly textarea (whichever appears). */
export function outputRegion(page: Page): Locator {
  return page.locator('[data-slot="code-block"]');
}

export async function getOutputText(page: Page): Promise<string> {
  // Some tools (hash generator, case converter) render output in a readonly
  // textarea; most render a CodeBlock. Wait for either, deterministically.
  const codeBlock = page.locator('[data-slot="code-block"]').first();
  const readonlyArea = page.locator("textarea[readonly]").first();

  await expect(codeBlock.or(readonlyArea)).toBeVisible({ timeout: 20_000 });

  if (await codeBlock.isVisible().catch(() => false)) {
    // Extract ONLY the code content, not the header (filename, buttons).
    // Shiki renders inside .rs-root > pre; sr-only line summaries excluded.
    const shikiPre = codeBlock.locator("pre").first();
    if (await shikiPre.isVisible().catch(() => false)) {
      return shikiPre.textContent() ?? "";
    }
    return codeBlock.textContent() ?? "";
  }
  return readonlyArea.inputValue();
}

/** Visible error alert text, or null when no error is shown. */
export async function getToolError(page: Page): Promise<string | null> {
  const alert = page.locator('[data-slot="alert"]').first();
  if (await alert.isVisible().catch(() => false)) {
    return alert.textContent();
  }
  return null;
}

export async function assertToolError(page: Page, part: string) {
  const alert = page.locator('[data-slot="alert"]').first();
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText(part);
}

/** Upload a file to the first hidden file input on a tool page. */
export async function uploadFile(
  page: Page,
  filePath: string,
  inputSelector = 'input[type="file"]',
) {
  const input = page.locator(inputSelector).first();
  await input.setInputFiles(filePath);
  // Wait for the file row to appear (name shown in the UI).
  await expect(page.locator("text=" + path.basename(filePath))).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Click a download button and capture the downloaded file.
 * Returns the suggested filename and the downloaded buffer.
 */
export async function downloadOutput(
  page: Page,
  buttonLabel: string | RegExp,
): Promise<{ filename: string; content: Buffer }> {
  const { readFile } = await import("node:fs/promises");
  const btn = page
    .getByRole("button", { name: buttonLabel })
    .first();
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
  await btn.click();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  const path = await download.path();
  const content = path ? await readFile(path) : Buffer.alloc(0);
  return { filename, content };
}

/** Read the page clipboard (requires clipboard permission — configured). */
export async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

/** Assert no horizontal overflow at the current viewport. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow detected").toBeLessThanOrEqual(0);
}
