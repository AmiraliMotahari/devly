import { describe, expect, it } from "vitest";
import { roundColor } from "@/tools/colors/culori-utils";
import { parse, formatHex, type Color } from "culori";

describe("roundColor", () => {
  it("rounds numeric channels to the given precision", () => {
    const color = {
      l: 0.123456789,
      c: 0.056789012,
      h: 277.123456789,
      mode: "oklch",
    } as Color;
    const rounded = roundColor(color, 3);
    expect((rounded as { l: number }).l).toBe(0.123);
    expect((rounded as { c: number }).c).toBe(0.057);
    expect((rounded as { h: number }).h).toBe(277.123);
  });

  it("leaves non-numeric fields untouched (mode string)", () => {
    const color = { r: 0.111111, g: 0.222222, b: 0.333333, mode: "rgb" } as Color;
    const rounded = roundColor(color, 2);
    expect((rounded as { mode: string }).mode).toBe("rgb");
  });

  it("handles precision 0 (integer rounding)", () => {
    const color = { l: 0.5678, mode: "lab" } as Color;
    expect((roundColor(color, 0) as { l: number }).l).toBe(1);
  });

  it("preserves the input object (does not mutate)", () => {
    const color = { l: 0.123456, mode: "oklch" } as Color;
    roundColor(color, 2);
    expect((color as { l: number }).l).toBe(0.123456);
  });

  it("works end-to-end with culori parse/format (idempotent rounding)", () => {
    const original = "#6366f1";
    const once = roundColor(parse(original) as Color, 3);
    const formatted = formatHex(once as never);
    const twice = roundColor(parse(formatted ?? original) as Color, 3);
    expect(formatHex(twice as never)).toBe(formatted);
  });
});
