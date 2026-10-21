import { describe, expect, it } from "vitest";
import {
  clamp,
  composeAdjustments,
  cssFilterFor,
  needsPixelPass,
  rotatedBounds,
  quarterTurnSize,
  clampCrop,
  applyAspectToCrop,
  fitCanvasToAspect,
  computeSplitRegions,
  splitRegionCount,
  computeMergeLayout,
  scaleCollageCells,
  reorderLayer,
  fitImage,
} from "@/tools/image/processing/geometry";
import {
  NEUTRAL_ADJUSTMENTS,
  FILTER_PRESETS,
  COLLAGE_TEMPLATES,
} from "@/tools/image/types/editor";
import type { EditorLayer, ImageLayer } from "@/tools/image/types/editor";

const imageLayer = (over: Partial<ImageLayer> = {}): ImageLayer => ({
  type: "image",
  id: "img-1",
  name: "Image",
  visible: true,
  opacity: 1,
  x: 100,
  y: 100,
  rotation: 0,
  locked: false,
  docId: "doc-1",
  width: 200,
  height: 100,
  flipX: false,
  flipY: false,
  crop: null,
  fit: "contain",
  adjustments: { ...NEUTRAL_ADJUSTMENTS },
  filter: null,
  filterAmount: 1,
  ...over,
});

describe("clamp", () => {
  it("clamps values into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("composeAdjustments", () => {
  it("returns base unchanged with no preset", () => {
    const base = { ...NEUTRAL_ADJUSTMENTS, brightness: 10 };
    expect(composeAdjustments(base, null, 1)).toBe(base);
  });

  it("adds preset deltas on top of manual values", () => {
    const out = composeAdjustments(NEUTRAL_ADJUSTMENTS, "warm", 1);
    expect(out.temperature).toBe(35);
    expect(out.saturation).toBe(10);
  });

  it("scales preset deltas by amount", () => {
    const out = composeAdjustments(NEUTRAL_ADJUSTMENTS, "warm", 0.5);
    expect(out.temperature).toBeCloseTo(17.5);
  });

  it("stacks with manual adjustments additively", () => {
    const manual = { ...NEUTRAL_ADJUSTMENTS, temperature: 10 };
    const out = composeAdjustments(manual, "cool", 1);
    expect(out.temperature).toBe(-25); // 10 + (-35)
  });

  it("clamps to valid ranges", () => {
    const manual = { ...NEUTRAL_ADJUSTMENTS, contrast: 80 };
    const out = composeAdjustments(manual, "high-contrast", 1);
    expect(out.contrast).toBe(100); // 80 + 40 clamped
  });
});

describe("cssFilterFor", () => {
  it("returns none for neutral", () => {
    expect(cssFilterFor(NEUTRAL_ADJUSTMENTS)).toBe("none");
  });
  it("includes brightness/contrast/saturate", () => {
    const css = cssFilterFor({ ...NEUTRAL_ADJUSTMENTS, brightness: 20, contrast: -10, saturation: 50 });
    expect(css).toContain("brightness(1.2)");
    expect(css).toContain("contrast(0.9)");
    expect(css).toContain("saturate(1.5)");
  });
});

describe("needsPixelPass", () => {
  it("is false for neutral and css-only adjustments", () => {
    expect(needsPixelPass(NEUTRAL_ADJUSTMENTS)).toBe(false);
    expect(needsPixelPass({ ...NEUTRAL_ADJUSTMENTS, brightness: 40 })).toBe(false);
  });
  it("is true for temperature/tint/highlights/shadows/sharpness", () => {
    for (const key of ["temperature", "tint", "highlights", "shadows", "sharpness"] as const) {
      expect(needsPixelPass({ ...NEUTRAL_ADJUSTMENTS, [key]: 1 })).toBe(true);
    }
  });
});

describe("rotatedBounds / quarterTurnSize", () => {
  it("computes rotated bounding box", () => {
    const b = rotatedBounds(100, 50, 90);
    expect(b.width).toBeCloseTo(50);
    expect(b.height).toBeCloseTo(100);
  });
  it("90° quarter turns swap dimensions, even turns keep them", () => {
    expect(quarterTurnSize(100, 50, 1)).toEqual({ width: 50, height: 100 });
    expect(quarterTurnSize(100, 50, 2)).toEqual({ width: 100, height: 50 });
    expect(quarterTurnSize(100, 50, 5)).toEqual({ width: 50, height: 100 });
  });
});

describe("clampCrop / applyAspectToCrop", () => {
  it("clamps crop into image bounds", () => {
    const c = clampCrop({ x: -10, y: 90, width: 500, height: 20 }, 100, 100);
    expect(c).toEqual({ x: 0, y: 80, width: 100, height: 20 });
  });
  it("locks crop to an aspect ratio", () => {
    const c = applyAspectToCrop({ x: 0, y: 0, width: 100, height: 80 }, 1, 100, 100);
    expect(c.width / c.height).toBeCloseTo(1);
  });
});

describe("fitCanvasToAspect", () => {
  it("keeps width when height fits", () => {
    expect(fitCanvasToAspect(1000, 1000, 1)).toEqual({ width: 1000, height: 1000 });
  });
  it("shrinks width when height is the constraint", () => {
    expect(fitCanvasToAspect(1000, 500, 1)).toEqual({ width: 500, height: 500 });
  });
});

describe("computeSplitRegions", () => {
  it("grid mode: rows × columns regions cover the canvas", () => {
    const regions = computeSplitRegions(100, 60, { mode: "grid", rows: 2, columns: 2, evenly: true });
    expect(regions).toHaveLength(4);
    const total = regions.reduce((sum, r) => sum + r.width * r.height, 0);
    expect(total).toBe(100 * 60);
  });
  it("rows mode: N horizontal strips regardless of columns", () => {
    const regions = computeSplitRegions(100, 90, { mode: "rows", rows: 3, columns: 2, evenly: true });
    expect(regions).toHaveLength(3);
    expect(regions[0].height).toBe(30);
    expect(regions[0].width).toBe(100);
    expect(splitRegionCount({ mode: "rows", rows: 3, columns: 2, evenly: true })).toBe(3);
  });

  it("columns mode: N vertical strips regardless of rows", () => {
    const regions = computeSplitRegions(100, 90, { mode: "columns", rows: 3, columns: 4, evenly: true });
    expect(regions).toHaveLength(4);
    expect(regions[0].width).toBe(25);
    expect(regions[0].height).toBe(90);
  });
  it("columns mode counts only columns", () => {
    expect(splitRegionCount({ mode: "columns", rows: 2, columns: 4, evenly: true })).toBe(4);
  });
});

describe("computeMergeLayout", () => {
  it("vertical layout stacks images with spacing", () => {
    const sizes = [
      { width: 100, height: 50 },
      { width: 100, height: 50 },
    ];
    const { canvas, cells } = computeMergeLayout(sizes, {
      layout: "vertical", spacing: 10, padding: 0, background: "#fff",
      align: "center", columns: 2, cellRadius: 0,
    });
    expect(canvas.height).toBe(110);
    expect(cells[0].y + cells[0].height + 10).toBeCloseTo(cells[1].y);
  });

  it("horizontal layout aligns images on cross axis", () => {
    // Both images are scaled to share the min height (50).
    const sizes = [
      { width: 100, height: 100 },
      { width: 50, height: 50 },
    ];
    const { canvas, cells } = computeMergeLayout(sizes, {
      layout: "horizontal", spacing: 0, padding: 0, background: "#fff",
      align: "center", columns: 2, cellRadius: 0,
    });
    // First: 50x50 at y=0; second: 50x50 at y=0 (same height after normalize)
    expect(cells[0].height).toBe(50);
    expect(cells[1].y).toBeCloseTo(0);
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(50);
  });

  it("horizontal layout centers a shorter image", () => {
    const sizes = [
      { width: 200, height: 100 },
      { width: 50, height: 50 },
    ];
    const { cells } = computeMergeLayout(sizes, {
      layout: "horizontal", spacing: 0, padding: 0, background: "#fff",
      align: "center", columns: 2, cellRadius: 0,
    });
    // Both scaled to height 50; both centered → same y
    expect(cells[0].y).toBeCloseTo(cells[1].y);
  });

  it("grid layout creates columns × rows canvas", () => {
    const sizes = Array.from({ length: 4 }, () => ({ width: 100, height: 100 }));
    const { canvas } = computeMergeLayout(sizes, {
      layout: "grid", spacing: 10, padding: 10, background: "#fff",
      align: "center", columns: 2, cellRadius: 0,
    });
    expect(canvas.width).toBe(2 * 100 + 10 + 20);
    expect(canvas.height).toBe(2 * 100 + 10 + 20);
  });

  it("returns empty for no images", () => {
    expect(computeMergeLayout([], {
      layout: "vertical", spacing: 0, padding: 0, background: "#fff",
      align: "center", columns: 1, cellRadius: 0,
    })).toEqual({ canvas: { width: 0, height: 0 }, cells: [] });
  });
});

describe("scaleCollageCells", () => {
  it("scales unit cells into the content box", () => {
    const cells = scaleCollageCells(
      [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
      200, 100, 0,
    );
    expect(cells[0]).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(cells[1]).toEqual({ x: 100, y: 0, width: 100, height: 100 });
  });

  it("applies spacing as inset only on inner edges", () => {
    const cells = scaleCollageCells(
      [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
      200, 100, 10,
    );
    // First cell: no left inset (outer edge), 10px right inset (inner edge)
    expect(cells[0].x).toBe(0);
    expect(cells[0].width).toBe(90);
    // Second cell: 10px left inset, no right inset
    expect(cells[1].x).toBe(110);
    expect(cells[1].width).toBe(90);
  });

  it("every template has cells matching its slot count", () => {
    for (const t of COLLAGE_TEMPLATES) {
      expect(t.cells.length, t.id).toBe(t.slots);
    }
  });
});

describe("reorderLayer", () => {
  const layers = ["a", "b", "c", "d"].map((id): EditorLayer =>
    imageLayer({ id, docId: `doc-${id}`, name: id }),
  );

  it("forward moves up one index", () => {
    expect(reorderLayer(layers, "a", "forward").map((l) => l.id)).toEqual(["b", "a", "c", "d"]);
  });
  it("backward moves down one index", () => {
    expect(reorderLayer(layers, "c", "backward").map((l) => l.id)).toEqual(["a", "c", "b", "d"]);
  });
  it("front sends to top", () => {
    expect(reorderLayer(layers, "a", "front").map((l) => l.id)).toEqual(["b", "c", "d", "a"]);
  });
  it("back sends to bottom", () => {
    expect(reorderLayer(layers, "d", "back").map((l) => l.id)).toEqual(["d", "a", "b", "c"]);
  });
  it("is a no-op for unknown ids", () => {
    expect(reorderLayer(layers, "zz", "front")).toBe(layers);
  });
});

describe("fitImage", () => {
  it("contain fits inside the box", () => {
    const f = fitImage(200, 100, 100, 100, "contain");
    expect(f.width).toBe(100);
    expect(f.height).toBe(50);
  });
  it("cover fills the box", () => {
    const f = fitImage(200, 100, 100, 100, "cover");
    expect(f.width).toBe(200);
    expect(f.height).toBe(100);
  });
  it("stretch uses the box exactly", () => {
    const f = fitImage(200, 100, 100, 300, "stretch");
    expect(f).toEqual({ width: 100, height: 300, offsetX: 0, offsetY: 0 });
  });
});

describe("FILTER_PRESETS integrity", () => {
  it("has unique ids and valid adjustment deltas", () => {
    const ids = FILTER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of FILTER_PRESETS) {
      expect(Object.keys(p.adjustments).length, p.id).toBeGreaterThan(0);
    }
  });
});
