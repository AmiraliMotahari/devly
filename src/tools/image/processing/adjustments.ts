/**
 * Pixel-level adjustments (CPU-heavy path).
 *
 * temperature/tint/highlights/shadows/sharpness cannot be expressed as
 * CSS/canvas filter strings, so they run as typed-array math over the
 * layer's pixels. For large areas the pass runs in a Web Worker
 * (off-main-thread) with a synchronous fallback for small areas and
 * environments without workers.
 *
 * Pure functions exported for unit tests; the DOM pieces (getImageData,
 * worker plumbing) live behind small adapters.
 */

import type { ImageAdjustments } from "../types/editor";

/* ── Pure pixel math (no DOM) ───────────────────────────── */

export type Rgba = { r: number; g: number; b: number; a: number };

/** Signed tone-curve lift/cut for highlights & shadows (film-style). */
export function toneCurve(
  value: number,
  highlights: number,
  shadows: number,
): number {
  // Normalize 0..255 → 0..1
  const x = value / 255;
  // Highlight mask: smooth ramp favoring upper range; shadow mask its inverse.
  const hm = x * x; // 0 at black, 1 at white
  const sm = 1 - hm;
  const adjusted = x + (highlights / 100) * 0.25 * hm + (shadows / 100) * 0.25 * sm;
  return Math.round(Math.min(1, Math.max(0, adjusted)) * 255);
}

/** Temperature/tint channel shifts (approximate Kelvin balance). */
export function whiteBalance(
  r: number,
  g: number,
  b: number,
  temperature: number,
  tint: number,
): Rgba {
  const t = temperature / 100;
  const ti = tint / 100;
  // Warm = boost R, cut B; cool = inverse. Tint: green↔magenta on G.
  return {
    r: clamp255(r + 40 * t + 10 * ti),
    g: clamp255(g + 10 * t - 20 * ti),
    b: clamp255(b - 40 * t + 10 * ti),
    a: 255,
  };
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * In-place pixel pass over an RGBA buffer. Unit-testable core.
 */
export function applyAdjustmentsToBuffer(
  data: Uint8ClampedArray,
  adjustments: Pick<
    ImageAdjustments,
    "temperature" | "tint" | "highlights" | "shadows"
  >,
): void {
  const { temperature, tint, highlights, shadows } = adjustments;
  const needsWB = temperature !== 0 || tint !== 0;
  const needsTone = highlights !== 0 || shadows !== 0;
  if (!needsWB && !needsTone) return;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    if (needsWB) {
      const wb = whiteBalance(r, g, b, temperature, tint);
      r = wb.r;
      g = wb.g;
      b = wb.b;
    }
    if (needsTone) {
      r = toneCurve(r, highlights, shadows);
      g = toneCurve(g, highlights, shadows);
      b = toneCurve(b, highlights, shadows);
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/* ── Unsharp mask (sharpness) ──────────────────────────── */

/** 3×3 box blur of an RGBA buffer (alpha preserved). Returns new buffer. */
export function boxBlur3(
  src: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  // Horizontal pass then vertical pass with a 1-2-1 kernel.
  const tmp = new Uint8ClampedArray(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const xl = Math.max(0, x - 1) * 4 + y * width * 4;
      const xr = Math.min(width - 1, x + 1) * 4 + y * width * 4;
      const xc = i;
      for (let c = 0; c < 3; c++) {
        tmp[i + c] = (src[xl + c] + 2 * src[xc + c] + src[xr + c]) / 4;
      }
      tmp[i + 3] = src[i + 3];
    }
  }
  for (let y = 0; y < height; y++) {
    const yu = Math.max(0, y - 1);
    const yd = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const iu = (yu * width + x) * 4;
      const id = (yd * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        out[i + c] = (tmp[iu + c] + 2 * tmp[i + c] + tmp[id + c]) / 4;
      }
      out[i + 3] = src[i + 3];
    }
  }
  return out;
}

/**
 * Unsharp mask: out = src + amount * (src - blur). amount 0..1+.
 * Applied to a copy; returns the sharpened buffer.
 */
export function unsharpMask(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): Uint8ClampedArray {
  if (amount <= 0) return src;
  const blurred = boxBlur3(src, width, height);
  const out = new Uint8ClampedArray(src.length);
  const a = amount; // 0..1 (sharpness/100)
  for (let i = 0; i < src.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      out[i + c] = src[i + c] + a * (src[i + c] - blurred[i + c]);
    }
    out[i + 3] = src[i + 3];
  }
  return out;
}

/* ── DOM adapter ────────────────────────────────────────── */

export type PixelPassOptions = {
  /** Skip the O(n·3) unsharp mask (fast mode during drags). */
  skipSharpen?: boolean;
};

/**
 * Apply the pixel pass to a rectangle of a canvas context *in place*.
 *
 * Designed for an UNTRANSFORMED offscreen canvas (identity transform):
 * x/y/w/h are backing-store pixels. The previous transformed-context use
 * was removed — getImageData/putImageData ignore rotation/flip and
 * corrupted transformed layers. Callers draw the source into an
 * offscreen layer canvas first, then composite the result.
 */
export function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  options: PixelPassOptions = {},
): void {
  const px = Math.max(0, Math.floor(x));
  const py = Math.max(0, Math.floor(y));
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  // Clip the region to the canvas backing store.
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const regionW = Math.min(w, cw - px);
  const regionH = Math.min(h, ch - py);
  if (regionW <= 0 || regionH <= 0) return;

  const image = ctx.getImageData(px, py, regionW, regionH);
  applyAdjustmentsToBuffer(image.data, adjustments);
  if (adjustments.sharpness > 0 && options.skipSharpen !== true) {
    const sharpened = unsharpMask(image.data, regionW, regionH, adjustments.sharpness / 100);
    image.data.set(sharpened);
  }
  ctx.putImageData(image, px, py);
}
