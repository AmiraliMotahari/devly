import { describe, it, expect } from "vitest";

describe("manifest", () => {
  it("has required fields", async () => {
    const mod = await import("@/app/manifest");
    const manifest = mod.default();
    expect(manifest.name as string).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons!.length).toBeGreaterThan(0);
    expect((manifest.icons as { sizes: string }[]).every((i) => /^\d+x\d+$/.test(i.sizes))).toBe(true);
    expect((manifest.icons as { purpose?: string }[]).some((i) => i.purpose === "any")).toBe(true);
    expect((manifest.icons as { purpose?: string }[]).some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("has shortcuts", async () => {
    const mod = await import("@/app/manifest");
    const manifest = mod.default();
    expect(manifest.shortcuts).toBeDefined();
    expect((manifest.shortcuts as unknown[]).length).toBeGreaterThan(0);
  });
});
