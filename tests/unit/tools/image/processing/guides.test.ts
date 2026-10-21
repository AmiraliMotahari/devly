import { describe, expect, it } from "vitest";
import {
  normalizeGuides,
  splitRegionsFromGuides,
  computeSplitRegions,
  splitRegionCount,
  nextGuidePosition,
} from "@/tools/image/processing/geometry";
import type { SplitOptions } from "@/tools/image/types/editor";

describe("normalizeGuides", () => {
  it("sorts and dedupes within 1px tolerance", () => {
    expect(normalizeGuides([300, 100, 100.4, 200], 400)).toEqual([100, 200, 300]);
  });

  it("clamps positions into (0, bound)", () => {
    expect(normalizeGuides([-50, 0, 999], 400)).toEqual([1, 399]);
  });

  it("drops non-finite values", () => {
    expect(normalizeGuides([NaN, 120, Infinity], 400)).toEqual([120]);
  });

  it("returns empty for empty input", () => {
    expect(normalizeGuides([], 400)).toEqual([]);
  });
});

describe("nextGuidePosition", () => {
  it("midpoint of an empty canvas", () => {
    expect(nextGuidePosition([], 400)).toBe(200);
  });

  it("places the new cut in the widest gap", () => {
    // Gaps: 0–100 (100), 100–350 (250), 350–400 (50) → widest = 100–350.
    expect(nextGuidePosition([100, 350], 400)).toBe(225);
  });

  it("never collides with an existing cut (would be merged by normalizeGuides)", () => {
    for (const existing of [[200], [100, 300], [50, 150, 350]]) {
      const next = nextGuidePosition(existing, 400);
      const merged = normalizeGuides([...existing, next], 400);
      expect(merged).toHaveLength(existing.length + 1);
    }
  });

  it("clamps into the canvas bounds", () => {
    expect(nextGuidePosition([], 2)).toBe(1);
  });
});

describe("splitRegionsFromGuides", () => {
  it("divides the canvas at each cut", () => {
    const regions = splitRegionsFromGuides(400, 300, [100, 250], [150]);
    // 3 columns × 2 rows = 6 regions
    expect(regions).toHaveLength(6);
    const widths = regions.slice(0, 3).map((r) => r.width);
    const heights = [regions[0].height, regions[3].height];
    expect(widths).toEqual([100, 150, 150]);
    expect(heights).toEqual([150, 150]);
    // First row starts at 0; second at the cut
    expect(regions[0].y).toBe(0);
    expect(regions[3].y).toBe(150);
  });

  it("no guides = one full-canvas region", () => {
    const regions = splitRegionsFromGuides(100, 80, [], []);
    expect(regions).toEqual([
      { id: "r0c0", x: 0, y: 0, width: 100, height: 80 },
    ]);
  });

  it("is pure w.r.t. input arrays (does not mutate)", () => {
    const gx = [200];
    splitRegionsFromGuides(400, 300, gx, []);
    expect(gx).toEqual([200]);
  });
});

describe("computeSplitRegions — custom guides integration", () => {
  it("uses guides when evenly is false and guides exist", () => {
    const options: SplitOptions = {
      mode: "grid",
      rows: 4,
      columns: 4,
      evenly: false,
      guideX: [128],
      guideY: [128],
    };
    const regions = computeSplitRegions(256, 256, options);
    // 2×2 from the guides, not 4×4 from rows/columns
    expect(regions).toHaveLength(4);
    expect(regions.map((r) => r.width)).toEqual([128, 128, 128, 128]);
  });

  it("falls back to the even grid without guides (legacy callers)", () => {
    const options: SplitOptions = {
      mode: "grid",
      rows: 2,
      columns: 2,
      evenly: false,
    };
    expect(computeSplitRegions(400, 300, options)).toHaveLength(4);
  });

  it("even split ignores guides", () => {
    const options: SplitOptions = {
      mode: "grid",
      rows: 2,
      columns: 3,
      evenly: true,
      guideX: [100],
      guideY: [100],
    };
    expect(computeSplitRegions(600, 400, options)).toHaveLength(6);
  });
});

describe("splitRegionCount — guides aware", () => {
  it("counts guide cells when uneven", () => {
    const options: SplitOptions = {
      mode: "grid",
      rows: 9,
      columns: 9,
      evenly: false,
      guideX: [100, 200],
      guideY: [120],
    };
    // 2 vertical cuts → 3 columns; 1 horizontal cut → 2 rows
    expect(splitRegionCount(options, 400, 300)).toBe(6);
  });

  it("falls back to grid counts without guides", () => {
    expect(
      splitRegionCount({ mode: "grid", rows: 2, columns: 2, evenly: false }, 400, 300),
    ).toBe(4);
  });
});
