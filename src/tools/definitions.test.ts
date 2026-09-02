import { describe, expect, it } from "vitest";
import { toolDefinitions, getRelatedTools, getToolBySlug, getToolsByCategory } from "./definitions";
import { CATEGORY_META, TOOL_CATEGORIES } from "./categories";

const validCategories = new Set(Object.keys(CATEGORY_META));

describe("tool registry integrity (drives routes, sitemap, search)", () => {
  it("every definition declares all required fields", () => {
    for (const tool of toolDefinitions) {
      expect(tool.id, `id of ${tool.slug}`).toMatch(/^[\w-]+$/);
      expect(tool.slug, `slug of ${tool.id}`).toMatch(/^[a-z0-9-]+$/);
      expect(tool.name.length, `name of ${tool.slug}`).toBeGreaterThan(0);
      expect(tool.description.length, `desc of ${tool.slug}`).toBeGreaterThan(
        20,
      );
      expect(validCategories.has(tool.category), `category of ${tool.slug}`).toBe(
        true,
      );
      expect(["client", "server", "hybrid"]).toContain(tool.processingMode);
      expect(["file", "text", "none"]).toContain(tool.inputKind);
      expect(["file", "text", "image", "none"]).toContain(tool.outputKind);
      expect(typeof tool.supportsBatch).toBe("boolean");
      expect(typeof tool.requiresAuthentication).toBe("boolean");
      expect(typeof tool.available).toBe("boolean");
    }
  });

  it("has no duplicate ids or slugs (route collisions)", () => {
    const ids = toolDefinitions.map((t) => t.id);
    const slugs = toolDefinitions.map((t) => t.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps slugs URL-safe (no reserved path chars)", () => {
    for (const tool of toolDefinitions) {
      expect(tool.slug).not.toMatch(/[/\\?#%&=+]/);
    }
  });

  it("every tool has at least one keyword for search discovery", () => {
    for (const tool of toolDefinitions) {
      const discoverable =
        (tool.keywords?.length ?? 0) > 0 ||
        (tool.aliases?.length ?? 0) > 0 ||
        tool.name.split(/\s+/).length > 1;
      expect(discoverable, `discoverability of ${tool.slug}`).toBe(true);
    }
  });

  it("getToolBySlug resolves and returns undefined for unknowns", () => {
    expect(getToolBySlug("json-to-yaml")?.slug).toBe("json-to-yaml");
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });

  it("getToolsByCategory returns only that category's tools", () => {
    const pdfTools = getToolsByCategory("pdf");
    expect(pdfTools.length).toBeGreaterThan(0);
    expect(pdfTools.every((t) => t.category === "pdf")).toBe(true);
    expect(getToolsByCategory("nonexistent" as never)).toEqual([]);
  });

  it("getRelatedTools returns existing tools, capped at 4, never including itself", () => {
    const yaml = getToolBySlug("json-to-yaml");
    expect(yaml).toBeDefined();
    const related = getRelatedTools(yaml!);
    expect(related.length).toBeGreaterThan(0);
    expect(related.length).toBeLessThanOrEqual(4);
    expect(related.some((t) => t.slug === "json-to-yaml")).toBe(false);
    const slugs = new Set(toolDefinitions.map((t) => t.slug));
    for (const t of related) {
      expect(slugs.has(t.slug)).toBe(true);
    }
  });

  it("CATEGORY_META covers exactly the categories used by tools", () => {
    const used = new Set(toolDefinitions.map((t) => t.category));
    for (const cat of used) expect(validCategories.has(cat)).toBe(true);
    // Every declared category has at least one tool
    for (const cat of TOOL_CATEGORIES) {
      expect(used.has(cat as never), `orphan category ${cat}`).toBe(true);
    }
  });

  it("every category meta entry has label, description and icon", () => {
    for (const meta of Object.values(CATEGORY_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(10);
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });
});
