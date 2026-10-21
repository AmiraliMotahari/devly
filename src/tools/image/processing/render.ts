/**
 * Canvas 2D renderer for the Advanced Image Editor.
 *
 * Renders an EditorProject at *preview* scale (device-appropriate) or
 * *export* scale (full resolution). Image pixels live in a registry
 * (docId → ImageBitmap) held outside React state; the project model only
 * references docIds, keeping undo/redo snapshots cheap.
 */

import type {
  EditorProject,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  CanvasSpec,
  ImageAdjustments,
} from "../types/editor";
import { cssFilterFor, needsPixelPass, fitImage, clamp } from "./geometry";
import { applyPixelAdjustments } from "./adjustments";
import { composeAdjustments } from "./geometry";
import { encodeCanvasToBlob } from "@/lib/image-encode";

/* ── Bitmap registry ─────────────────────────────────────── */

export interface ImageDoc {
  id: string;
  name: string;
  width: number;
  height: number;
  type: string;
  size: number;
  get: () => CanvasImageSource & { width: number; height: number };
  release: () => void;
}

/**
 * In-memory store for decoded images. Not part of React state or history.
 */
export class BitmapRegistry {
  private docs = new Map<string, ImageDoc>();

  add(doc: ImageDoc): void {
    this.docs.set(doc.id, doc);
  }

  get(id: string): ImageDoc | undefined {
    return this.docs.get(id);
  }

  list(): ImageDoc[] {
    return [...this.docs.values()];
  }

  release(id: string): void {
    const doc = this.docs.get(id);
    if (doc) {
      doc.release();
      this.docs.delete(id);
    }
  }

  releaseAll(): void {
    for (const doc of this.docs.values()) doc.release();
    this.docs.clear();
  }

  /**
   * Release docs not referenced by any *reachable* project (current +
   * undo past + redo future). Called after state changes so removed-image
   * bitmaps are freed while history can still undo to them.
   */
  reconcile(projects: EditorProject[]): void {
    const referenced = new Set<string>();
    for (const project of projects) {
      for (const layer of project.layers) {
        if (layer.type === "image") referenced.add(layer.docId);
      }
    }
    for (const doc of [...this.docs.values()]) {
      if (!referenced.has(doc.id)) this.release(doc.id);
    }
  }
}

/** Decode a File into an ImageDoc (createImageBitmap when available). */
export async function fileToImageDoc(
  file: File,
  maxPixels = 40_000_000,
): Promise<{ doc: ImageDoc | null; error?: string; downscale?: number }> {
  try {
    if (!file.type.startsWith("image/")) {
      return { doc: null, error: `"${file.name}" is not an image file.` };
    }
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = null;
    }
    if (!bitmap) {
      return {
        doc: null,
        error: `"${file.name}" could not be decoded. The file may be corrupt or in an unsupported format.`,
      };
    }
    const pixels = bitmap.width * bitmap.height;
    if (pixels > maxPixels) {
      // Downscale to cap memory, preserving aspect.
      const factor = Math.sqrt(maxPixels / pixels);
      const w = Math.max(1, Math.round(bitmap.width * factor));
      const h = Math.max(1, Math.round(bitmap.height * factor));
      const cnv = document.createElement("canvas");
      cnv.width = w;
      cnv.height = h;
      const ctx = cnv.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const scaled = await createImageBitmap(cnv);
      return { doc: makeBitmapDoc(file, scaled), downscale: factor };
    }
    return { doc: makeBitmapDoc(file, bitmap) };
  } catch (err) {
    return {
      doc: null,
      error: `"${file.name}" failed to load: ${(err as Error).message}`,
    };
  }
}

function makeBitmapDoc(file: File, bitmap: ImageBitmap): ImageDoc {
  let released = false;
  return {
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    width: bitmap.width,
    height: bitmap.height,
    type: file.type,
    size: file.size,
    get: () => {
      if (released) throw new Error("Bitmap already released");
      return bitmap;
    },
    release: () => {
      if (!released) {
        released = true;
        bitmap.close();
      }
    },
  };
}

/* ── Helpers ─────────────────────────────────────────────── */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function borderDash(style: string, width: number): number[] {
  if (style === "dashed") return [Math.max(4, width * 3), Math.max(3, width * 2)];
  if (style === "dotted") return [Math.max(1, width), Math.max(2, width * 2)];
  return [];
}

function isDefaultAdjustments(a: ImageAdjustments): boolean {
  return (
    a.brightness === 0 && a.contrast === 0 && a.saturation === 0 &&
    a.exposure === 0 && a.temperature === 0 && a.tint === 0 &&
    a.highlights === 0 && a.shadows === 0 && a.sharpness === 0 &&
    a.blur === 0 && a.grayscale === 0
  );
}

function composedAdjustments(layer: ImageLayer): ImageAdjustments {
  return composeAdjustments(layer.adjustments, layer.filter, layer.filterAmount);
}

/** Render the project into a canvas context at the given scale. */
export function renderProject(
  ctx: CanvasRenderingContext2D,
  project: EditorProject,
  registry: BitmapRegistry,
  options: { scale?: number; fast?: boolean } = {},
): void {
  const scale = options.scale ?? 1;
  const { canvas } = project;
  ctx.save();
  ctx.scale(scale, scale);

  // Corner radius clips the background AND all layer content; the border
  // frame is drawn after (outside the clip) so its full width stays visible.
  ctx.save();
  roundRect(ctx, 0, 0, canvas.width, canvas.height, canvas.borderRadius);
  ctx.clip();

  if (canvas.background !== "transparent") {
    ctx.fillStyle = canvas.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Layers bottom → top
  for (const layer of project.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = clamp(layer.opacity, 0, 1);
    switch (layer.type) {
      case "image":
        renderImageLayer(ctx, layer, registry, { ...options, scale });
        break;
      case "text":
        renderTextLayer(ctx, layer);
        break;
      case "shape":
        renderShapeLayer(ctx, layer);
        break;
    }
    ctx.restore();
  }
  ctx.restore(); // end corner-radius clip

  // Border frame on top (unclipped: frame edges include the outer boundary)
  const b = canvas.border;
  if (b.style !== "none" && b.width > 0) {
    ctx.save();
    ctx.strokeStyle = b.color;
    if (b.style === "double") {
      drawDoubleBorder(ctx, canvas);
    } else {
      ctx.lineWidth = b.width;
      if (b.style === "dashed" || b.style === "dotted") {
        ctx.setLineDash(borderDash(b.style, b.width));
      }
      roundRect(
        ctx,
        b.width / 2,
        b.width / 2,
        canvas.width - b.width,
        canvas.height - b.width,
        canvas.borderRadius,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawDoubleBorder(ctx: CanvasRenderingContext2D, canvas: CanvasSpec): void {
  const w = canvas.border.width;
  if (w <= 0) return;
  const gap = Math.max(1, w * 0.75);
  ctx.strokeStyle = canvas.border.color;
  ctx.lineWidth = Math.max(1, w * 0.5);
  roundRect(ctx, w / 2, w / 2, canvas.width - w, canvas.height - w, canvas.borderRadius);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, w * 0.5);
  roundRect(
    ctx,
    w + gap,
    w + gap,
    canvas.width - 2 * (w + gap),
    canvas.height - 2 * (w + gap),
    Math.max(0, canvas.borderRadius - w),
  );
  ctx.stroke();
}

function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  registry: BitmapRegistry,
  options: { fast?: boolean; scale?: number },
): void {
  const doc = registry.get(layer.docId);
  const crop = layer.crop;
  const sx = crop ? crop.x : 0;
  const sy = crop ? crop.y : 0;
  const sw = crop ? crop.width : doc?.width ?? layer.width;
  const sh = crop ? crop.height : doc?.height ?? layer.height;

  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);

  if (!doc) {
    // Missing bitmap (already released): placeholder box.
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.restore();
    return;
  }

  const source = doc.get();
  const fit = fitImage(sw, sh, layer.width, layer.height, layer.fit);
  const dx = -layer.width / 2 + fit.offsetX;
  const dy = -layer.height / 2 + fit.offsetY;
  const composed = composedAdjustments(layer);

  ctx.imageSmoothingQuality = "high";
  if (isDefaultAdjustments(composed)) {
    // No adjustments at all: plain draw.
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, fit.width, fit.height);
    ctx.restore();
    return;
  }

  // Pixel-level adjustments (temperature/tint/highlights/shadows/sharpness)
  // cannot run on the transformed context — getImageData/putImageData work
  // in device pixels and would corrupt rotated/flipped layers. Instead:
  // draw the (filtered) source into a layer-sized offscreen canvas, apply
  // the pixel pass there, then composite the result under the transform.
  const css = cssFilterFor(composed);
  const needsPixels = needsPixelPass(composed);
  const fast = options.fast === true;

  if (!needsPixels || (fast && composed.sharpness > 0 && !needsPixelTone(composed))) {
    // Fast path: CSS-expressible filters only, straight to the context.
    if (css !== "none") ctx.filter = css;
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, fit.width, fit.height);
    ctx.filter = "none";
    ctx.restore();
    return;
  }

  // Offscreen at render scale (rounded ≥1px) so pixel math matches what
  // will be composited; in fast mode skip only the O(n·3) unsharp mask.
  const renderScale = Math.max(0.01, options.scale ?? 1);
  const offW = Math.max(1, Math.round(fit.width * renderScale));
  const offH = Math.max(1, Math.round(fit.height * renderScale));
  const off = getScratchCanvas(offW, offH);
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) {
    // Degraded environment: fall back to the CSS-only draw.
    if (css !== "none") ctx.filter = css;
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, fit.width, fit.height);
    ctx.filter = "none";
    ctx.restore();
    return;
  }
  octx.clearRect(0, 0, offW, offH);
  if (css !== "none") octx.filter = css;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(
    source,
    sx, sy, sw, sh,
    0, 0, offW, offH,
  );
  octx.filter = "none";
  applyPixelAdjustments(octx, 0, 0, offW, offH, composed, { skipSharpen: fast });
  ctx.drawImage(off, dx, dy, fit.width, fit.height);
  releaseScratchCanvas(off);
  ctx.restore();
}

/** Tone/WB pass needed (independent of sharpness, which fast mode skips). */
function needsPixelTone(a: ImageAdjustments): boolean {
  return (
    a.temperature !== 0 || a.tint !== 0 || a.highlights !== 0 || a.shadows !== 0
  );
}

/* Scratch canvas pool: reused across renders to avoid per-frame allocation. */
const scratchPool: HTMLCanvasElement[] = [];
const SCRATCH_POOL_LIMIT = 3;

function getScratchCanvas(width: number, height: number): HTMLCanvasElement {
  // Reuse a pooled canvas when big enough; grow the pool up to the limit.
  for (let i = 0; i < scratchPool.length; i++) {
    const c = scratchPool[i];
    if (c.width >= width && c.height >= height) {
      scratchPool.splice(i, 1);
      if (c.width !== width || c.height !== height) {
        c.width = width;
        c.height = height;
      }
      return c;
    }
  }
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

/** Return a scratch canvas after use (keeps the largest few around). */
export function releaseScratchCanvas(c: HTMLCanvasElement): void {
  if (scratchPool.length >= SCRATCH_POOL_LIMIT) {
    // Evict the smallest pooled canvas to make room.
    let smallest = 0;
    for (let i = 1; i < scratchPool.length; i++) {
      if (scratchPool[i].width * scratchPool[i].height < scratchPool[smallest].width * scratchPool[smallest].height) {
        smallest = i;
      }
    }
    if (scratchPool[smallest].width * scratchPool[smallest].height <= c.width * c.height) {
      scratchPool.splice(smallest, 1);
    } else {
      return; // incoming canvas is smaller than everything pooled; drop it
    }
  }
  scratchPool.push(c);
}

/* ── Text ────────────────────────────────────────────────── */

export function textFontString(layer: TextLayer): string {
  return `${layer.italic ? "italic " : ""}${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
}

/** Measure a text layer: wrapped lines + total height. Canvas 2D required. */
export function measureTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
): { lines: string[]; lineHeightPx: number; height: number; width: number } {
  ctx.save();
  ctx.font = textFontString(layer);
  ctx.letterSpacing = `${layer.letterSpacing}px`;
  const words = layer.text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const fits = (s: string) => ctx.measureText(s).width <= layer.boxWidth;
  if (layer.text.length === 0) {
    lines.push("");
  } else {
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!fits(candidate) && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
  }
  if (current) lines.push(current);
  const lineHeightPx = layer.fontSize * layer.lineHeight;
  ctx.restore();
  return {
    lines,
    lineHeightPx,
    height: Math.max(lineHeightPx, lines.length * lineHeightPx),
    width: layer.boxWidth,
  };
}

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer): void {
  const { lines, lineHeightPx, height } = measureTextLayer(ctx, layer);
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.font = textFontString(layer);
  ctx.textAlign = layer.align;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${layer.letterSpacing}px`;

  if (layer.background) {
    ctx.save();
    ctx.fillStyle = layer.background.color;
    const bw = layer.boxWidth + layer.background.padding * 2;
    const bh = height + layer.background.padding * 2;
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, layer.background.radius);
    ctx.fill();
    ctx.restore();
  }

  const startX =
    layer.align === "left" ? -layer.boxWidth / 2 : layer.align === "right" ? layer.boxWidth / 2 : 0;
  let y = -height / 2 + lineHeightPx * 0.8;

  for (const line of lines) {
    if (layer.shadow) {
      ctx.save();
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.offsetX;
      ctx.shadowOffsetY = layer.shadow.offsetY;
      ctx.fillStyle = layer.color;
      ctx.fillText(line, startX, y);
      ctx.restore();
    }
    if (layer.outline && layer.outline.width > 0) {
      ctx.strokeStyle = layer.outline.color;
      ctx.lineWidth = layer.outline.width;
      ctx.lineJoin = "round";
      ctx.strokeText(line, startX, y);
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(line, startX, y);
    y += lineHeightPx;
  }
  ctx.restore();
}

/* ── Shapes ─────────────────────────────────────────────── */

function renderShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer): void {
  ctx.save();
  ctx.translate(layer.x, layer.y);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  const w = layer.width;
  const h = layer.height;
  switch (layer.shape) {
    case "rect":
      if (layer.radius > 0) roundRect(ctx, -w / 2, -h / 2, w, h, layer.radius);
      else ctx.rect(-w / 2, -h / 2, w, h);
      break;
    case "ellipse":
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case "triangle":
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      break;
    case "line":
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      break;
  }
  if (layer.fill && layer.shape !== "line") {
    ctx.fillStyle = layer.fill;
    ctx.fill();
  }
  if (layer.stroke && layer.strokeWidth > 0) {
    ctx.strokeStyle = layer.stroke;
    ctx.lineWidth = layer.strokeWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Export render ───────────────────────────────────────── */

/** Render the composite at full scale into an offscreen canvas. */
export function renderToCanvas(
  project: EditorProject,
  registry: BitmapRegistry,
  scale = 1,
): HTMLCanvasElement {
  const cnv = document.createElement("canvas");
  cnv.width = Math.max(1, Math.round(project.canvas.width * scale));
  cnv.height = Math.max(1, Math.round(project.canvas.height * scale));
  const ctx = cnv.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a 2D canvas context.");
  renderProject(ctx, project, registry, { scale });
  return cnv;
}

/**
 * Encode a canvas to a Blob. The shared encoder verifies the produced bytes
 * match the requested MIME type (Safari silently encodes PNG when asked for
 * WebP, which would ship a mislabeled file).
 */
export function canvasToBlob(
  cnv: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return encodeCanvasToBlob(cnv, mime, quality);
}
