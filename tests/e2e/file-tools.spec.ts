import { expect, test } from "@playwright/test";
import {
  downloadOutput,
  fixture,
  navigateToTool,
  runTool,
  trackPageErrors,
  uploadFile,
} from "./helpers";

test.describe("Image tools (real file processing)", () => {
  test("PNG→JPG converts and downloads a valid JPEG @critical", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "png-to-jpg");
    await uploadFile(page, fixture("pixel.png"));

    await runTool(page, "Process");

    const download = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const dl = await download;

    expect(dl.suggestedFilename()).toMatch(/\.jpe?g$/i);
    const path = await dl.path();
    if (path) {
      const { readFileSync } = await import("node:fs");
      const buf = readFileSync(path);
      // JPEG magic bytes
      expect(buf[0]).toBe(0xff);
      expect(buf[1]).toBe(0xd8);
    }
    await errors.assertNone("png-to-jpg");
  });

  test("JPG→WebP converts and downloads a WebP (RIFF header)", async ({
    page,
  }) => {
    await navigateToTool(page, "jpg-to-webp");
    await uploadFile(page, fixture("pixel.jpg"));

    await runTool(page, "Process");

    const download = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const dl = await download;

    expect(dl.suggestedFilename()).toMatch(/\.webp$/i);
    const path = await dl.path();
    if (path) {
      const { readFileSync } = await import("node:fs");
      const buf = readFileSync(path);
      // RIFF....WEBP
      expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
    }
  });

  test("rejecting a wrong file type is surfaced, app does not crash", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "png-to-jpg");
    await uploadFile(page, fixture("sample.txt"));

    // The file is marked invalid in the UI
    await expect(page.getByText(/unsupported|invalid/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await errors.assertNone("png-to-jpg wrong type");
  });
});

test.describe("PDF tools (pdf-lib + local pdf.js worker)", () => {
  test("PDF→Text extracts the text content of the fixture @critical", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "pdf-to-text");
    await uploadFile(page, fixture("hello.pdf"));

    await runTool(page, "Extract Text");

    // The result is delivered as a downloadable .txt — verify its content.
    const { filename, content } = await downloadOutput(page, /download/i);
    expect(filename).toMatch(/\.txt$/);
    expect(content.toString()).toContain("Hello PDF");

    // No CDN fetch for the worker — offline contract
    const cdn = await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .some((r) => r.name.includes("cdnjs") || r.name.includes("cloudflare")),
    );
    expect(cdn, "pdf.js worker must be served locally, not from a CDN").toBe(
      false,
    );
    await errors.assertNone("pdf-to-text");
  });

  test("Rotate PDF downloads a valid PDF", async ({ page }) => {
    await navigateToTool(page, "rotate-pdf");
    await uploadFile(page, fixture("hello.pdf"));

    await runTool(page, "Rotate PDF");

    const download = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const dl = await download;

    expect(dl.suggestedFilename()).toMatch(/\.pdf$/i);
    const path = await dl.path();
    if (path) {
      const { readFileSync } = await import("node:fs");
      const buf = readFileSync(path);
      expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    }
  });

  test("Merge PDF requires at least two files (validation)", async ({
    page,
  }) => {
    await navigateToTool(page, "merge-pdf");
    await uploadFile(page, fixture("hello.pdf"));

    const btn = page.getByRole("button", { name: /merge/i });
    // With one file the merge action is gated or errors when forced
    const disabled = await btn.isDisabled().catch(() => true);
    if (!disabled) {
      await btn.click();
      await expect(
        page.getByText(/at least 2/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

test.describe("ZIP tools", () => {
  test("Create ZIP from files and verify the archive structure", async ({
    page,
  }) => {
    await navigateToTool(page, "create-zip");
    await uploadFile(page, fixture("sample.txt"));
    await uploadFile(page, fixture("sample.json"));

    await runTool(page, /create/i);

    const download = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const dl = await download;

    expect(dl.suggestedFilename()).toMatch(/\.zip$/i);
    const path = await dl.path();
    if (path) {
      // Verify with the app's own JSZip in-page? Simpler: local zip listing
      const { execSync } = await import("node:child_process");
      const listing = execSync(`unzip -l "${path}"`).toString();
      expect(listing).toContain("sample.txt");
      expect(listing).toContain("sample.json");
    }
  });

  test("Password ZIP → Decrypt Encrypted ZIP round trip @critical", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    // Create the encrypted archive
    await navigateToTool(page, "create-encrypted-zip");
    await uploadFile(page, fixture("sample.txt"));
    const pwField = page.locator("#encryption-password");
    await pwField.fill("e2e-password");
    await runTool(page, /create/i);

    const dlPromise = page.waitForEvent("download", { timeout: 60_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const dl = await dlPromise;
    const archivePath = await dl.path();
    expect(archivePath).toBeTruthy();

    // Decrypt it back
    await navigateToTool(page, "extract-encrypted-zip");
    await uploadFile(page, archivePath!);
    await page.locator("#decryption-password").fill("e2e-password");
    await runTool(page, /decrypt/i);

    await expect(
      page.getByText("sample.txt").first(),
    ).toBeVisible({ timeout: 30_000 });

    const dl2 = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByRole("button", { name: /download/i }).first().click();
    const restored = await dl2;
    expect(restored.suggestedFilename()).toMatch(/\.zip$|\.txt$/i);
    await errors.assertNone("encrypted zip round trip");
  });
});

test.describe("File security", () => {
  test("Unicode and special filenames upload and process as data", async ({
    page,
  }) => {
    await navigateToTool(page, "create-zip");

    // Upload with a Unicode name via setInputFiles buffer
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({
      name: "照片 — résumé (final).txt",
      mimeType: "text/plain",
      buffer: Buffer.from("unicode filename content"),
    });
    await expect(
      page.getByText("照片 — résumé (final).txt"),
    ).toBeVisible({ timeout: 10_000 });

    await runTool(page, /create/i);
    await expect(page.getByRole("button", { name: /download/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
