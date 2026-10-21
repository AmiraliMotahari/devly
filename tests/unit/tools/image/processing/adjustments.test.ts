import { describe, expect, it } from "vitest";
import {
  toneCurve,
  whiteBalance,
  applyAdjustmentsToBuffer,
  boxBlur3,
  unsharpMask,
} from "@/tools/image/processing/adjustments";

function rgba(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a]);
}

describe("toneCurve", () => {
  it("lifts shadows with positive values", () => {
    expect(toneCurve(0, 0, 60)).toBeGreaterThan(0);
  });
  it("cuts highlights with negative values", () => {
    expect(toneCurve(255, -60, 0)).toBeLessThan(255);
  });
  it("stays within 0..255", () => {
    for (const v of [0, 64, 128, 255]) {
      expect(toneCurve(v, 100, 100)).toBeLessThanOrEqual(255);
      expect(toneCurve(v, -100, -100)).toBeGreaterThanOrEqual(0);
    }
  });
  it("keeps midtones roughly stable with small deltas", () => {
    const mid = toneCurve(128, 5, 5);
    expect(Math.abs(mid - 128)).toBeLessThan(10);
  });
});

describe("whiteBalance", () => {
  it("warms with positive temperature (R up, B down)", () => {
    const out = whiteBalance(128, 128, 128, 50, 0);
    expect(out.r).toBeGreaterThan(128);
    expect(out.b).toBeLessThan(128);
  });
  it("cools with negative temperature", () => {
    const out = whiteBalance(128, 128, 128, -50, 0);
    expect(out.r).toBeLessThan(128);
    expect(out.b).toBeGreaterThan(128);
  });
  it("tint shifts green↔magenta", () => {
    const out = whiteBalance(128, 128, 128, 0, 50);
    expect(out.g).toBeLessThan(128);
  });
});

describe("applyAdjustmentsToBuffer", () => {
  it("is a no-op for neutral adjustments", () => {
    const data = rgba(10, 20, 30);
    applyAdjustmentsToBuffer(data, { temperature: 0, tint: 0, highlights: 0, shadows: 0 });
    expect([...data]).toEqual([10, 20, 30, 255]);
  });

  it("applies white balance across pixels", () => {
    const data = new Uint8ClampedArray([...rgba(100, 150, 200), ...rgba(50, 60, 70)]);
    applyAdjustmentsToBuffer(data, { temperature: 40, tint: 0, highlights: 0, shadows: 0 });
    expect(data[0]).toBeGreaterThan(100); // R warmed
    expect(data[2]).toBeLessThan(200); // B cooled
    expect(data[6]).toBeLessThan(70);
  });

  it("preserves alpha", () => {
    const data = rgba(10, 20, 30, 128);
    applyAdjustmentsToBuffer(data, { temperature: 50, tint: 50, highlights: 50, shadows: 50 });
    expect(data[3]).toBe(128);
  });
});

describe("boxBlur3 / unsharpMask", () => {
  it("blur averages a 2x2 uniform image to itself", () => {
    const w = 4, h = 1;
    const src = new Uint8ClampedArray([
      100, 100, 100, 255, 100, 100, 100, 255,
      100, 100, 100, 255, 100, 100, 100, 255,
    ]);
    const out = boxBlur3(src, w, h);
    for (let i = 0; i < out.length; i += 4) {
      expect(out[i]).toBeCloseTo(100);
    }
  });

  it("sharpens a step edge (unsharp mask adds contrast)", () => {
    // 1D step: dark | light
    const w = 2, h = 1;
    const src = new Uint8ClampedArray([
      40, 40, 40, 255, 200, 200, 200, 255,
      40, 40, 40, 255, 200, 200, 200, 255,
    ]);
    const sharpened = unsharpMask(src, w, h, 1);
    // Left pixel gets darker, right gets brighter
    expect(sharpened[0]).toBeLessThan(40);
    expect(sharpened[4]).toBeGreaterThan(200);
  });

  it("amount 0 returns input unchanged", () => {
    const src = new Uint8ClampedArray([10, 20, 30, 255]);
    expect(unsharpMask(src, 1, 1, 0)).toBe(src);
  });
});
