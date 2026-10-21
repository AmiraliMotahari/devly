import { describe, expect, it } from "vitest";
import {
  normalizeExportConfig,
  formatSupportsAlpha,
  FORMAT_MIME,
  FORMAT_EXTENSION,
} from "@/tools/image/processing/export";
import { detectBackgroundColor, applyChromaKey } from "@/tools/image/editor/background-removal";

describe("normalizeExportConfig", () => {
  it("fills defaults for a partial config", () => {
    const cfg = normalizeExportConfig({});
    expect(cfg.format).toBe("png");
    expect(cfg.quality).toBe(92);
    expect(cfg.scale).toBe(1);
    expect(cfg.filename).toMatch(/\.png$/);
  });

  it("clamps quality and scale into valid ranges", () => {
    const cfg = normalizeExportConfig({ quality: 500, scale: 10 });
    expect(cfg.quality).toBe(100);
    expect(cfg.scale).toBe(2);
    const cfg2 = normalizeExportConfig({ quality: 0, scale: 0.01 });
    expect(cfg2.quality).toBe(1);
    expect(cfg2.scale).toBeCloseTo(0.1);
  });

  it("sanitizes filenames and applies the format extension", () => {
    const cfg = normalizeExportConfig({ filename: "my photo!! <>.jpg", format: "webp" });
    expect(cfg.filename).toBe("my-photo-.webp");
  });

  it("falls back to a default filename when empty", () => {
    const cfg = normalizeExportConfig({ filename: "   ", format: "jpeg" });
    expect(cfg.filename).toMatch(/^edited\.jpg$/);
  });
});

describe("format tables", () => {
  it("maps every format to mime and extension", () => {
    expect(FORMAT_MIME.png).toBe("image/png");
    expect(FORMAT_EXTENSION.jpeg).toBe("jpg");
    expect(formatSupportsAlpha("png")).toBe(true);
    expect(formatSupportsAlpha("webp")).toBe(true);
    expect(formatSupportsAlpha("jpeg")).toBe(false);
  });
});

describe("background removal (chroma-key)", () => {
  it("detects the dominant border color", () => {
    // 2x2: blue border, red center pixel
    const data = new Uint8ClampedArray([
      0, 0, 255, 255, 0, 0, 255, 255,
      0, 0, 255, 255, 255, 0, 0, 255,
    ]);
    const bg = detectBackgroundColor(data, 2, 2);
    expect(bg.b).toBeGreaterThan(bg.r);
    expect(bg.b).toBeCloseTo(255 * 3 / 3, 0); // averaged blue border
  });

  it("removes pixels close to the background color", () => {
    // All pixels blue (background)
    const data = new Uint8ClampedArray([
      10, 10, 200, 255, 12, 12, 205, 255,
    ]);
    applyChromaKey(data, 2, 1, { r: 10, g: 10, b: 200 }, 20, 0);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
  });

  it("keeps pixels far from the background", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    applyChromaKey(data, 1, 1, { r: 10, g: 10, b: 200 }, 20, 0);
    expect(data[3]).toBe(255);
  });

  it("feathers the alpha edge near the tolerance boundary", () => {
    // Slightly-off blue: between radius-feather and radius+feather
    const data = new Uint8ClampedArray([40, 40, 210, 255]);
    applyChromaKey(data, 1, 1, { r: 10, g: 10, b: 200 }, 20, 3);
    expect(data[3]).toBeGreaterThan(0);
    expect(data[3]).toBeLessThanOrEqual(255);
  });
});
