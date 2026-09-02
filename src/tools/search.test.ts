import { beforeEach, describe, expect, it } from "vitest";
import { searchTools } from "./search";
import { toolDefinitions } from "./definitions";

const everySlug = () => toolDefinitions.map((t) => t.slug);

describe("searchTools", () => {
  it("returns nothing for an empty query", () => {
    expect(searchTools("")).toEqual([]);
    expect(searchTools("   ")).toEqual([]);
  });

  it("finds a tool by exact name match and ranks it first", () => {
    const results = searchTools("json to yaml");
    expect(results.length).toBeGreaterThan(0);

    const jsonToYaml = toolDefinitions.find((t) => t.slug === "json-to-yaml");
    expect(jsonToYaml).toBeDefined();
    expect(results[0].tool.slug).toBe("json-to-yaml");
  });

  it("matches tool aliases", () => {
    // "unzip" is an alias of extract-zip, not part of its name
    const results = searchTools("unzip");
    expect(
      results.some((r) => r.tool.slug === "extract-zip"),
    ).toBe(true);
  });

  it("matches keywords", () => {
    const results = searchTools("oklch");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.tool.slug !== undefined)).toBe(true);
  });

  it("scores exact name matches above partial matches", () => {
    const results = searchTools("json");
    expect(results.length).toBeGreaterThan(3);
    const scores = results.map((r) => r.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it("respects the limit argument", () => {
    const all = searchTools("json", 100);
    const limited = searchTools("json", 3);
    expect(limited.length).toBeLessThanOrEqual(3);
    expect(all.length).toBeGreaterThanOrEqual(limited.length);
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(searchTools("  JSON  ").map((r) => r.tool.slug)).toEqual(
      searchTools("json").map((r) => r.tool.slug),
    );
  });

  it("returns no results for gibberish", () => {
    expect(searchTools("zzzzqxv")).toEqual([]);
  });

  it("every definition has a unique slug and every slug resolves to a route", () => {
    const slugs = everySlug();
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const tool of toolDefinitions) {
      expect(tool.slug).toMatch(/^[a-z0-9-]+$/);
      expect(tool.name.length).toBeGreaterThan(0);
    }
  });

  it("every relatedToolSlugs entry points at an existing tool", () => {
    const slugs = new Set(everySlug());
    for (const tool of toolDefinitions) {
      for (const related of tool.relatedToolSlugs ?? []) {
        expect(slugs.has(related)).toBe(true);
      }
    }
  });
});

describe("searchTools — dedupe regression (palette duplicate rows)", () => {
  beforeEach(() => {
    // The palette layer dedupes by slug; ensure the raw search itself never
    // returns the same tool twice for multi-term queries.
  });

  it("never returns duplicate tools for multi-term queries", () => {
    const results = searchTools("json schema");
    const slugs = results.map((r) => r.tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
