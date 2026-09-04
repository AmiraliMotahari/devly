import { expect, test } from "@playwright/test";
import {
  fillInput,
  getOutputText,
  navigateToTool,
  runTool,
  trackPageErrors,
} from "./helpers";

test.describe("Encrypt Text (AES-256-GCM + PBKDF2)", () => {
  test("encrypts to a devly-v1 envelope and decrypts it back @critical", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "text-encrypt-decrypt");

    const secret = "attack at dawn — 中文 🎉";
    const password = "correct-horse-battery-staple";

    // Encrypt
    await fillInput(page, "Plain text", secret);
    await page.locator("#ted-password").fill(password);
    await runTool(page, "Encrypt");

    const envelope = (await getOutputText(page)).trim();
    expect(envelope).toMatch(
      /^devly-v1:\.?[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/,
    );
    expect(envelope).not.toContain(secret);

    // Switch to decrypt mode via the select
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Decrypt" }).click();

    await fillInput(page, "Encrypted message", envelope);
    await page.locator("#ted-password").fill(password);
    await runTool(page, "Decrypt");

    const decrypted = await getOutputText(page);
    expect(decrypted.trim()).toBe(secret);
    await errors.assertNone("text-encrypt-decrypt round trip");
  });

  test("wrong password fails with a user-visible error, no garbage output @critical", async ({
    page,
  }) => {
    await navigateToTool(page, "text-encrypt-decrypt");

    await fillInput(page, "Plain text", "top secret");
    await page.locator("#ted-password").fill("right-password");
    await runTool(page, "Encrypt");
    const envelope = (await getOutputText(page)).trim();

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Decrypt" }).click();
    await fillInput(page, "Encrypted message", envelope);
    await page.locator("#ted-password").fill("wrong-password");
    await runTool(page, "Decrypt");

    await expect(page.locator('[data-slot="alert"]').first()).toBeVisible();
    await expect(
      page.locator('[data-slot="alert"]').first(),
    ).toContainText(/wrong password|failed/i);
    // No partial output was produced
    expect(await page.locator('[data-slot="code-block"]').count()).toBe(0);
  });

  test("paste of non-envelope text gives a helpful error", async ({ page }) => {
    await navigateToTool(page, "text-encrypt-decrypt");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Decrypt" }).click();

    await fillInput(page, "Encrypted message", "just some plain text");
    await page.locator("#ted-password").fill("pw");
    await runTool(page, "Decrypt");

    await expect(page.locator('[data-slot="alert"]').first()).toBeVisible();
    await expect(page.locator('[data-slot="alert"]').first()).toContainText(
      /doesn't look like|encrypt/i,
    );
  });
});

test.describe("UUID generator", () => {
  test("generates valid UUIDs of the selected version", async ({ page }) => {
    await navigateToTool(page, "uuid-generator");
    await runTool(page, /generate/i);

    const out = await getOutputText(page);
    const uuids = out.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    );
    expect(uuids, "output contains at least one UUID").not.toBeNull();
    expect(uuids!.length).toBeGreaterThan(0);
    for (const id of uuids!.slice(0, 5)) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  test("regenerates different UUIDs on repeated runs", async ({ page }) => {
    await navigateToTool(page, "uuid-generator");
    await runTool(page, /generate/i);
    const first = await getOutputText(page);

    await runTool(page, /generate/i);
    const second = await getOutputText(page);

    expect(first).not.toBe(second);
  });
});

test.describe("Password generator", () => {
  test("respects the length option and character sets", async ({ page }) => {
    await navigateToTool(page, "password-generator");

    const lengthInput = page.locator("#pwd-length");
    await lengthInput.fill("24");
    await runTool(page, /generate/i);

    const pwd = (await getOutputText(page)).trim();
    expect(pwd.length).toBe(24);
  });

  test("PIN preset produces only digits", async ({ page }) => {
    await navigateToTool(page, "password-generator");

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /6-digit PIN/i }).click();
    await runTool(page, /generate/i);

    const pwd = (await getOutputText(page)).trim();
    expect(pwd).toMatch(/^\d{6}$/);
  });
});

test.describe("Text diff", () => {
  test("line mode highlights changed lines between two texts", async ({
    page,
  }) => {
    await navigateToTool(page, "text-diff");

    const oldArea = page.locator("#diff-old");
    const newArea = page.locator("#diff-new");
    await oldArea.fill("one\ntwo\nthree");
    await newArea.fill("one\nTWO-CHANGED\nthree\nfour");

    // Classic line mode renders rows
    await expect(page.getByText("TWO-CHANGED").first()).toBeVisible();
    await expect(page.getByText("four").first()).toBeVisible();
  });

  test("unified mode shows highlighted changed lines in both panes", async ({
    page,
  }) => {
    await navigateToTool(page, "text-diff");

    await page.locator("#diff-old").fill("one\ntwo\nthree");
    await page.locator("#diff-new").fill("one\nTWO-CHANGED\nthree");

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /unified/i }).click();

    // Two code blocks with a highlighted line each (original + new)
    await expect(page.locator(".diff-removed .rs-highlighted-line")).toHaveCount(1);
    await expect(page.locator(".diff-added .rs-highlighted-line")).toHaveCount(1);
  });
});

test.describe("JSON diff", () => {
  test("reports added and removed keys between two documents", async ({
    page,
  }) => {
    await navigateToTool(page, "json-diff");
    // json-diff has two textareas for old/new JSON
    const areas = page.locator("textarea");
    await areas.nth(0).fill('{"a":1,"b":2}');
    await areas.nth(1).fill('{"a":1,"c":3}');
    await runTool(page, /compare|diff/i);

    await expect(page.getByText(/b|c/i).first()).toBeVisible();
  });
});
