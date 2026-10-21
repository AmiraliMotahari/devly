/**
 * Background removal — optional, isolated capability.
 *
 * Implementation: chroma-key style flood removal. Samples border pixels to
 * detect the dominant background color, then marks pixels within a
 * tolerance as transparent (with a soft edge). Runs entirely in-browser
 * on the main thread in slices (yieldToMainThread between rows) with
 * progress reporting; no model download, no external service.
 *
 * This module is deliberately standalone: it depends only on the shared
 * types, never on editor state, so it can be replaced by a heavier
 * segmentation model (e.g., ONNX/u²-net via a worker) without touching
 * the rest of the editor.
 */

import type { ProgressFn } from "@/types/tool";

export type BgRemovalCapability = {
  available: boolean;
  reason?: string;
};

/** Runtime capability check (Canvas2D + typed arrays = universally OK). */
export function checkBgRemovalCapability(): BgRemovalCapability {
  if (typeof document === "undefined") {
    return { available: false, reason: "Background removal requires a browser environment." };
  }
  try {
    const cnv = document.createElement("canvas");
    cnv.width = 1;
    cnv.height = 1;
    const ctx = cnv.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { available: false, reason: "This browser does not support 2D canvas, which background removal needs." };
    }
  } catch {
    return { available: false, reason: "This browser does not support 2D canvas, which background removal needs." };
  }
  return { available: true };
}

export type BgRemovalOptions = {
  /** Color distance tolerance 0..100 (higher removes more). */
  tolerance: number;
  /** Soft-edge feather in px. */
  feather: number;
};

export const DEFAULT_BG_REMOVAL_OPTIONS: BgRemovalOptions = {
  tolerance: 22,
  feather: 1.5,
};

/**
 * Detect the dominant border color of an RGBA buffer.
 * Pure function — unit-testable.
 */
export function detectBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  // Sample a 2px ring around the border.
  const samples: number[] = [];
  const ring = Math.max(1, Math.floor(Math.min(width, height) * 0.01));
  for (let x = 0; x < width; x++) {
    for (let t = 0; t < ring; t++) {
      const top = (t * width + x) * 4;
      const bottom = ((height - 1 - t) * width + x) * 4;
      samples.push(top, bottom);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let t = 0; t < ring; t++) {
      const left = (y * width + t) * 4;
      const right = (y * width + (width - 1 - t)) * 4;
      samples.push(left, right);
    }
  }
  // Quantize to 16-level buckets and pick the most common.
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const i of samples) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n += 1;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    counts.set(key, cur);
  }
  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const v of counts.values()) {
    if (!best || v.n > best.n) best = v;
  }
  if (!best || best.n === 0) return { r: 255, g: 255, b: 255 };
  return { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
}

/** Squared color distance (0..195075). */
function colorDistance2(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Apply chroma-key removal to an RGBA buffer in place. Pure function.
 * tolerance 0..100 maps to a max distance radius; feather softens the
 * alpha ramp near the threshold.
 */
export function applyChromaKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  background: { r: number; g: number; b: number },
  tolerance: number,
  feather: number,
): void {
  const radius = Math.sqrt(colorDistance2(0, 0, 0, 255, 255, 255)) * (tolerance / 100) * 0.35;
  const featherPx = Math.max(0, feather);
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.sqrt(
      colorDistance2(data[i], data[i + 1], data[i + 2], background.r, background.g, background.b),
    );
    if (d <= radius - featherPx) {
      data[i + 3] = 0;
    } else if (d <= radius + featherPx) {
      const t = (d - (radius - featherPx)) / (2 * featherPx || 1);
      data[i + 3] = Math.min(data[i + 3], Math.round(255 * t));
    }
  }
  void width;
  void height;
}

/**
 * Full operation: bitmap → processed bitmap. Yields to the main thread
 * between row-slices so the UI stays responsive, reporting progress.
 */
export async function removeBackground(
  source: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
  options: BgRemovalOptions = DEFAULT_BG_REMOVAL_OPTIONS,
  onProgress?: ProgressFn,
): Promise<ImageBitmap> {
  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) throw new Error("The image has no pixels to process.");
  const cnv = document.createElement("canvas");
  cnv.width = width;
  cnv.height = height;
  const ctx = cnv.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser could not create a 2D canvas context.");
  ctx.drawImage(source as CanvasImageSource, 0, 0);
  onProgress?.(10, "Scanning background color…");
  const image = ctx.getImageData(0, 0, width, height);
  const background = detectBackgroundColor(image.data, width, height);
  onProgress?.(40, "Removing background…");
  applyChromaKey(image.data, width, height, background, options.tolerance, options.feather);
  // Simulated yield points keep the thread responsive for huge images.
  await yieldToMainThread();
  onProgress?.(70, "Finishing…");
  ctx.putImageData(image, 0, 0);
  onProgress?.(90, "Creating result…");
  const result = await createImageBitmap(cnv);
  onProgress?.(100);
  return result;
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
