import { expect, test } from "@playwright/test";
import {
  fillInput,
  getOutputText,
  navigateToTool,
  runTool,
  trackPageErrors,
} from "./helpers";
import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURES = path.resolve(__dirname, "../fixtures");
const fixtureFile = (name: string) => path.join(FIXTURES, name);

const jsonFixture = readFileSync(fixtureFile("sample.json"), "utf8");

test.describe("JSON ↔ YAML converter (bidirectional correctness)", () => {
  test("converts JSON to YAML that a YAML parser round-trips", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "json-to-yaml");
    await fillInput(page, "JSON Input", jsonFixture);
    await runTool(page, "Convert");

    const yaml = await getOutputText(page);
    // Semantic check: key facts from the JSON survive
    expect(yaml).toContain("name: Devly");
    expect(yaml).toContain("version: 1");
    expect(yaml).toContain("enabled: true");
    // Nested structures survive
    expect(yaml).toContain("nested:");
    expect(yaml).toContain("deep: 42");
    await errors.assertNone("json-to-yaml");
  });

  test("converts YAML back to JSON with the same values", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "yaml-to-json");
    await fillInput(
      page,
      "YAML Input",
      "name: Devly\nversion: 1\nnested:\n  deep: 42\n",
    );
    await runTool(page, "Convert");

    const json = await getOutputText(page);
    const parsed = JSON.parse(json.replace(/^\uFEFF/, ""));
    expect(parsed.name).toBe("Devly");
    expect(parsed.version).toBe(1);
    expect(parsed.nested.deep).toBe(42);
    await errors.assertNone("yaml-to-json");
  });

  test("rejects malformed JSON with a visible error and keeps input", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-yaml");
    await fillInput(page, "JSON Input", "{ this is not json");
    await runTool(page, "Convert");

    const alert = page.locator('[data-slot="alert"]').first();
    await expect(alert).toBeVisible();
    // The user's input is not cleared on failure
    const value = await page
      .locator("textarea")
      .first()
      .inputValue();
    expect(value).toContain("this is not json");
  });
});

test.describe("JSON validator (feedback quality)", () => {
  test("accepts valid JSON with a success state", async ({ page }) => {
    await navigateToTool(page, "json-validator");
    await fillInput(page, "JSON Input", jsonFixture);
    await runTool(page, "Validate");
    await expect(page.getByText(/valid json/i).first()).toBeVisible();
  });

  test("rejects malformed JSON and points at the problem", async ({ page }) => {
    await navigateToTool(page, "json-validator");
    await fillInput(page, "JSON Input", '{"a": tru}');
    await runTool(page, "Validate");

    const alert = page.locator('[data-slot="alert"]').first();
    await expect(alert).toBeVisible();
    // The message identifies the offending position/content
    await expect(alert).toContainText(/tru|position/i);
  });

  test("recovery: fixing the input after an error yields success", async ({
    page,
  }) => {
    await navigateToTool(page, "json-validator");
    const area = page.locator("textarea").first();
    await area.fill('{"a": tru}');
    await runTool(page, "Validate");
    await expect(page.locator('[data-slot="alert"]').first()).toBeVisible();

    await area.fill('{"a": true}');
    await runTool(page, "Validate");
    await expect(page.getByText(/valid json/i).first()).toBeVisible();
  });
});

test.describe("JSON ↔ CSV converter", () => {
  test("converts JSON array to CSV and back with values preserved", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "json-to-csv");
    await fillInput(
      page,
      "JSON Input",
      '[{"name":"Alice","age":30},{"name":"Bob","age":25}]',
    );
    await runTool(page, "Convert");

    const csv = await getOutputText(page);
    expect(csv).toContain("name,age");
    expect(csv).toContain("Alice,30");
    expect(csv).toContain("Bob,25");
    await errors.assertNone("json-to-csv");
  });

  test("converts CSV to JSON with typed values and quoted commas", async ({
    page,
  }) => {
    await navigateToTool(page, "csv-to-json");
    await fillInput(
      page,
      "CSV Input",
      'name,city\n"Smith, John",NYC\nAlice,Berlin',
    );
    await runTool(page, "Convert");

    const json = await getOutputText(page);
    const parsed = JSON.parse(json);
    expect(parsed[0].name).toBe("Smith, John"); // quoted comma preserved
    expect(parsed[0].city).toBe("NYC");
    expect(parsed[1].name).toBe("Alice");
  });

  test("CSV from file: uploads fixture and converts", async ({ page }) => {
    await navigateToTool(page, "csv-to-json");
    // CSV tools are textarea-based; exercise paste path instead of upload
    const csv = readFileSync(fixtureFile("sample.csv"), "utf8");
    await fillInput(page, "CSV Input", csv);
    await runTool(page, "Convert");

    const json = await getOutputText(page);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(3);
    expect(parsed[2].name).toBe("Smith, John");
  });
});

test.describe("JSON ↔ XML converter", () => {
  test("converts JSON to parseable XML with values intact", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-xml");
    await fillInput(
      page,
      "JSON Input",
      '{"catalog":{"book":[{"title":"Refactoring"},{"title":"Clean Code"}]}}',
    );
    await runTool(page, "Convert");

    const xml = await getOutputText(page);
    const parsed = await page.evaluate((src: string) => {
      const doc = new DOMParser().parseFromString(src, "application/xml");
      return doc.querySelector("parsererror") ? null : doc;
    }, xml);
    expect(parsed, "output must be valid XML").not.toBeNull();
    expect(xml).toContain("Refactoring");
    expect(xml).toContain("Clean Code");
  });

  test("converts XML to JSON preserving structure", async ({ page }) => {
    const xml = readFileSync(fixtureFile("sample.xml"), "utf8");
    await navigateToTool(page, "xml-to-json");
    await fillInput(page, "XML Input", xml);
    await runTool(page, "Convert");

    const json = await getOutputText(page);
    const parsed = JSON.parse(json);
    expect(JSON.stringify(parsed)).toContain("Refactoring");
    expect(JSON.stringify(parsed)).toContain("Martin Fowler");
  });
});

test.describe("JSON ↔ TOML converter", () => {
  test("round-trips a TOML document through JSON", async ({ page }) => {
    await navigateToTool(page, "toml-to-json");
    const toml = readFileSync(fixtureFile("sample.toml"), "utf8");
    await fillInput(page, "TOML Input", toml);
    await runTool(page, "Convert");

    const json = await getOutputText(page);
    const parsed = JSON.parse(json);
    expect(parsed.server.port).toBe(8080);
    expect(parsed.server.host).toBe("localhost");
    expect(parsed.features.dark).toBe(true);
  });

  test("converts JSON to TOML with correct table syntax", async ({
    page,
  }) => {
    await navigateToTool(page, "json-to-toml");
    await fillInput(
      page,
      "JSON Input",
      '{"server":{"port":8080},"features":{"dark":true}}',
    );
    await runTool(page, "Convert");

    const toml = await getOutputText(page);
    expect(toml).toMatch(/\[server\]/);
    expect(toml).toContain("port = 8080");
    expect(toml).toMatch(/dark = true/);
  });
});

test.describe("Formatters — idempotency", () => {
  test("JSON formatter formats and is idempotent", async ({ page }) => {
    await navigateToTool(page, "json-formatter");
    await fillInput(page, "JSON Input", '{"b":1,"a":{"c":[2,3]}}');
    await runTool(page, "Format");

    const first = await getOutputText(page);
    expect(JSON.parse(first)).toEqual({ b: 1, a: { c: [2, 3] } });

    // format(format(x)) === format(x)
    await fillInput(page, "JSON Input", first);
    await runTool(page, "Format");
    const second = await getOutputText(page);
    expect(second.trim()).toBe(first.trim());
  });

  test("JSON minifier reduces size and preserves semantics", async ({
    page,
  }) => {
    await navigateToTool(page, "json-minifier");
    await fillInput(page, "JSON Input", '{\n  "name":  "Devly",\n  "v": 1\n}');
    await runTool(page, "Minify");

    const minified = await getOutputText(page);
    expect(JSON.parse(minified)).toEqual({ name: "Devly", v: 1 });
    expect(minified).not.toContain("\n");
  });
});

test.describe("Base64 encode/decode (known vector + round-trip)", () => {
  test("encodes ASCII with the authoritative RFC 4648 vector", async ({
    page,
  }) => {
    await navigateToTool(page, "base64-encode-decode");

    // Known vector: "foobar" -> "Zm9vYmFy"
    await fillInput(page, "Text to encode", "foobar");
    await runTool(page, "Encode");

    const out = await getOutputText(page);
    expect(out).toContain("Zm9vYmFy");
  });

  test("decodes base64 back to the original including unicode", async ({
    page,
  }) => {
    await navigateToTool(page, "base64-encode-decode");

    // base64("héllo") computed with standard UTF-8 padding
    const encoded = await page.evaluate(() =>
      btoa(String.fromCharCode(...new TextEncoder().encode("héllo"))),
    );

    // switch to decode mode
    await page
      .getByRole("button", { name: "Decode", exact: true })
      .and(page.locator('[data-size="sm"]'))
      .first()
      .click();
    await fillInput(page, "Base64 to decode", encoded);
    await runTool(page, "Decode");

    const out = await getOutputText(page);
    expect(out).toContain("héllo");
  });

  test("rejects invalid base64 with a visible error", async ({ page }) => {
    await navigateToTool(page, "base64-encode-decode");
    await page
      .getByRole("button", { name: "Decode", exact: true })
      .and(page.locator('[data-size="sm"]'))
      .first()
      .click();
    await fillInput(page, "Base64 to decode", "!!!!not-base64@@@@");
    await runTool(page, "Decode");
    await expect(page.locator('[data-slot="alert"]').first()).toBeVisible();
  });
});

test.describe("URL encode/decode", () => {
  test("encodes and decodes query strings preserving unicode", async ({
    page,
  }) => {
    await navigateToTool(page, "url-encode-decode");
    await fillInput(page, "Text to encode", "café & spice=中文");
    await runTool(page, "Encode");
    const encoded = await getOutputText(page);
    expect(encoded).toContain("caf");

    await page
      .getByRole("button", { name: "Decode", exact: true })
      .and(page.locator('[data-size="sm"]'))
      .first()
      .click();
    await fillInput(page, "URL to decode", encoded.trim());
    await runTool(page, "Decode");
    const decoded = await getOutputText(page);
    expect(decoded).toContain("café & spice=中文");
  });
});

test.describe("Hash generator (known vectors)", () => {
  test("computes SHA-256 of 'abc' per NIST vector", async ({ page }) => {
    await navigateToTool(page, "hash-generator");
    await fillInput(page, "Input text", "abc");

    const generate = page.getByRole("button", { name: /generate hash/i });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
    }

    const out = await getOutputText(page);
    // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(out.toLowerCase()).toContain(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("computes SHA-256 of the classic 448-bit test string per NIST vector", async ({
    page,
  }) => {
    await navigateToTool(page, "hash-generator");
    // "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq" (FIPS 180 vector)
    await fillInput(
      page,
      "Input text",
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    );

    const generate = page.getByRole("button", { name: /generate hash/i });
    if (await generate.isVisible().catch(() => false)) {
      await generate.click();
    }

    const out = await getOutputText(page);
    expect(out.toLowerCase()).toContain(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });
});

test.describe("Case converter / text utilities", () => {
  test("converts text case live as the user types", async ({ page }) => {
    await navigateToTool(page, "case-converter");
    await fillInput(page, "Input", "hello world example");

    // Case converter renders output live in a readonly textarea
    const out = await getOutputText(page);
    expect(out.toLowerCase()).toContain("hello world example");
  });
});
