import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("precache manifest", () => {
  it("contains all tool slugs with no duplicates", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "public/precache-manifest.json"), "utf8"),
    );
    expect(Array.isArray(manifest.urls)).toBe(true);
    expect(manifest.urls.length).toBeGreaterThan(80);

    // No duplicates
    const unique = new Set(manifest.urls);
    expect(unique.size).toBe(manifest.urls.length);

    // Contains tool routes
    const toolUrls = manifest.urls.filter((u: string) => u.startsWith("/tools/"));
    expect(toolUrls.length).toBeGreaterThan(80);

    // Contains essential pages
    expect(manifest.urls).toContain("/");
    expect(manifest.urls).toContain("/offline");
  });
});
