/**
 * Pure geometry & math for the Advanced Image Editor.
 * No DOM dependency — fully unit-testable.
 */

import type {
  ImageAdjustments,
  FilterPresetId,
  FilterPreset,
  SplitOptions,
  SplitRegion,
  MergeOptions,
  CanvasSpec,
  EditorLayer,
  ImageLayer,
  ShapeKind,
} from "../types/editor";
import { FILTER_PRESETS, NEUTRAL_ADJUSTMENTS } from "../types/editor";

/* ── Adjustments ─────────────────────────────────────────── */

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** Apply a filter preset on top of manual adjustments (additive, clamped). */
export function composeAdjustments(
  base: ImageAdjustments,
  presetId: FilterPresetId | null,
  amount: number,
): ImageAdjustments {
  if (!presetId) return base;
  const preset = FILTER_PRESETS.find((p) => p.id === presetId);
  if (!preset) return base;
  const a = amount <= 0 || amount > 1 ? 1 : amount;
  const out = { ...base };
  for (const key of Object.keys(preset.adjustments) as (keyof ImageAdjustments)[]) {
    const delta = (preset.adjustments[key] ?? 0) * a;
    out[key] = clamp((base[key] ?? 0) + delta, key === "sharpness" || key === "blur" || key === "grayscale" || key === "opacity" ? 0 : -100, 100);
  }
  return out;
}

export function presetById(id: FilterPresetId | null): FilterPreset | null {
  if (!id) return null;
  return FILTER_PRESETS.find((p) => p.id === id) ?? null;
}

export function isNeutral(adjustments: ImageAdjustments): boolean {
  return Object.keys(NEUTRAL_ADJUSTMENTS).every(
    (k) => (adjustments as Record<string, number>)[k] ===
      (NEUTRAL_ADJUSTMENTS as Record<string, number>)[k],
  );
}

/**
 * Map composed adjustments to a CSS/canvas `filter` string for the
 * cheap parts. Pixel-math parts (temperature, tint, highlights, shadows,
 * sharpness) are handled by applyPixelAdjustments.
 */
export function cssFilterFor(adjustments: ImageAdjustments): string {
  const parts: string[] = [];
  if (adjustments.brightness !== 0)
    parts.push(`brightness(${(100 + adjustments.brightness) / 100})`);
  if (adjustments.contrast !== 0)
    parts.push(`contrast(${(100 + adjustments.contrast) / 100})`);
  if (adjustments.saturation !== 0)
    parts.push(`saturate(${(100 + adjustments.saturation) / 100})`);
  if (adjustments.exposure !== 0)
    parts.push(`brightness(${Math.pow(2, adjustments.exposure / 100)})`);
  if (adjustments.grayscale !== 0)
    parts.push(`grayscale(${adjustments.grayscale / 100})`);
  if (adjustments.blur !== 0)
    parts.push(`blur(${(adjustments.blur / 100) * 12}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export const needsPixelPass = (adjustments: ImageAdjustments): boolean =>
  adjustments.temperature !== 0 ||
  adjustments.tint !== 0 ||
  adjustments.highlights !== 0 ||
  adjustments.shadows !== 0 ||
  adjustments.sharpness !== 0;

/* ── Rotation / straighten ───────────────────────────────── */

/** Bounding box of a rotated rectangle. */
export function rotatedBounds(
  width: number,
  height: number,
  rotationDeg: number,
): { width: number; height: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    width: width * c + height * s,
    height: width * s + height * c,
  };
}

/** Bounding-box size when rotating an image by a multiple of 90°. */
export function quarterTurnSize(
  width: number,
  height: number,
  quarterTurns: number,
): { width: number; height: number } {
  const even = ((quarterTurns % 4) + 4) % 4 % 2 === 0;
  return even ? { width, height } : { width: height, height: width };
}

/* ── Crop ────────────────────────────────────────────────── */

export type CropRect = { x: number; y: number; width: number; height: number };

/** Clamp a crop rect to image bounds with a minimum size. */
export function clampCrop(
  crop: CropRect,
  imageWidth: number,
  imageHeight: number,
  minSize = 1,
): CropRect {
  const width = clamp(crop.width, minSize, imageWidth);
  const height = clamp(crop.height, minSize, imageHeight);
  return {
    width,
    height,
    x: clamp(crop.x, 0, imageWidth - width),
    y: clamp(crop.y, 0, imageHeight - height),
  };
}

/** Compute an aspect-locked crop starting from a free rect. */
export function applyAspectToCrop(
  crop: CropRect,
  aspect: number | null,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  if (!aspect || aspect <= 0) return clampCrop(crop, imageWidth, imageHeight);
  const width = clamp(crop.width, 1, imageWidth);
  let height = width / aspect;
  if (height > imageHeight) {
    height = imageHeight;
    const w = height * aspect;
    return clampCrop({ x: crop.x, y: crop.y, width: w, height }, imageWidth, imageHeight);
  }
  return clampCrop({ x: crop.x, y: crop.y, width, height }, imageWidth, imageHeight);
}

/* ── Aspect presets ─────────────────────────────────────── */

export const ASPECT_VALUES: Record<string, number | null> = {
  free: null,
  original: null, // resolved at runtime against the base image
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "3:2": 3 / 2,
  "2:3": 2 / 3,
};

/** Fit a canvas dimension pair to an aspect, keeping the larger area. */
export function fitCanvasToAspect(
  width: number,
  height: number,
  aspect: number | null,
): { width: number; height: number } {
  if (!aspect || aspect <= 0) return { width: Math.round(width), height: Math.round(height) };
  let w = width;
  let h = w / aspect;
  if (h > height) {
    h = height;
    w = h * aspect;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

/* ── Split geometry ─────────────────────────────────────── */

/**
 * Compute split regions for rows/columns/grid modes. Pure & deterministic —
 * output drives both the preview overlay and the export slices.
 * - "rows": N horizontal strips (columns ignored → 1 column)
 * - "columns": N vertical strips (rows ignored → 1 row)
 * - "grid": rows × columns
 */
export function computeSplitRegions(
  width: number,
  height: number,
  options: SplitOptions,
): SplitRegion[] {
  // Custom guides take precedence when the even split is turned off and
  // at least one cut position exists (undefined guides fall through to
  // the even grid below so legacy callers keep working).
  if (
    !options.evenly &&
    ((options.guideX !== undefined && options.guideX.length > 0) ||
      (options.guideY !== undefined && options.guideY.length > 0))
  ) {
    return splitRegionsFromGuides(
      width,
      height,
      options.guideX ?? [],
      options.guideY ?? [],
    );
  }
  const rows = Math.max(1, Math.floor(options.mode === "columns" ? 1 : options.rows));
  const cols = Math.max(1, Math.floor(options.mode === "rows" ? 1 : options.columns));
  const regions: SplitRegion[] = [];
  const cellW = width / cols;
  const cellH = height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      regions.push({
        id: `r${r}c${c}`,
        x: Math.round(c * cellW),
        y: Math.round(r * cellH),
        width: Math.round(cellW),
        height: Math.round(cellH),
      });
    }
  }
  // Mode selection: "rows" means N horizontal strips; "columns" N vertical
  // strips; "grid" uses both. All are expressed via rows×cols above.
  return regions;
}

export function splitRegionCount(options: SplitOptions, width = 0, height = 0): number {
  if (!options.evenly) {
    const hasGuides =
      (options.guideX !== undefined && options.guideX.length > 0) ||
      (options.guideY !== undefined && options.guideY.length > 0);
    if (hasGuides) {
      const cols = 1 + normalizeGuides(options.guideX ?? [], width || 1).length;
      const rows = 1 + normalizeGuides(options.guideY ?? [], height || 1).length;
      return cols * rows;
    }
  }
  if (options.mode === "rows") return Math.max(1, Math.floor(options.rows));
  if (options.mode === "columns") return Math.max(1, Math.floor(options.columns));
  return Math.max(1, Math.floor(options.rows)) * Math.max(1, Math.floor(options.columns));
}

/* ── Custom split guides ───────────────────────────────── */

/**
 * Normalize custom guide positions: sorted, clamped to (0, bound), and
 * de-duplicated within a 1px tolerance so dragging can't produce zero-width
 * regions. Pure — unit-tested.
 */
export function normalizeGuides(
  guides: number[],
  bound: number,
): number[] {
  const out: number[] = [];
  for (const g of [...guides].sort((a, b) => a - b)) {
    if (!Number.isFinite(g)) continue;
    const v = clamp(g, 1, Math.max(1, bound - 1));
    if (out.length === 0 || v - out[out.length - 1] >= 1) out.push(v);
  }
  return out;
}

/**
 * Position for a NEW guide cut: the midpoint of the widest gap between
 * existing cuts (and the edges). Adding a cut can never collide with
 * another guide this way (normalizeGuides would otherwise merge it).
 */
export function nextGuidePosition(guides: number[], bound: number): number {
  const cuts = normalizeGuides(guides, bound);
  const stops = [0, ...cuts, bound];
  let bestMid = bound / 2;
  let bestWidth = -1;
  for (let i = 0; i < stops.length - 1; i++) {
    const width = stops[i + 1] - stops[i];
    if (width > bestWidth) {
      bestWidth = width;
      bestMid = (stops[i] + stops[i + 1]) / 2;
    }
  }
  return clamp(Math.round(bestMid), 1, Math.max(1, bound - 1));
}

/**
 * Compute split regions from custom guide cut positions.
 * `guideX` holds x positions of vertical cuts (px from the left edge);
 * `guideY` holds y positions of horizontal cuts (px from the top edge).
 * Vertical cuts divide into columns, horizontal cuts into rows — matching
 * the rows/columns semantics of the even split. Pure & deterministic.
 */
export function splitRegionsFromGuides(
  width: number,
  height: number,
  guideX: number[],
  guideY: number[],
): SplitRegion[] {
  const xs = [0, ...normalizeGuides(guideX, width), width];
  const ys = [0, ...normalizeGuides(guideY, height), height];
  const regions: SplitRegion[] = [];
  for (let r = 0; r < ys.length - 1; r++) {
    for (let c = 0; c < xs.length - 1; c++) {
      regions.push({
        id: `r${r}c${c}`,
        x: xs[c],
        y: ys[r],
        width: xs[c + 1] - xs[c],
        height: ys[r + 1] - ys[r],
      });
    }
  }
  return regions;
}

/* ── Merge layout ────────────────────────────────────────── */

export type MergeCell = { x: number; y: number; width: number; height: number };

/**
 * Layout multiple images into one canvas (vertical/horizontal/grid).
 * `sizes` are natural image sizes; returns canvas size + cell rects and
 * the drawn size for each image inside its cell (contain fit).
 */
export function computeMergeLayout(
  sizes: { width: number; height: number }[],
  options: MergeOptions,
): { canvas: { width: number; height: number }; cells: MergeCell[] } {
  const n = sizes.length;
  if (n === 0) return { canvas: { width: 0, height: 0 }, cells: [] };
  const { spacing, padding } = options;
  const fit = (w: number, h: number, cw: number, ch: number) => {
    const scale = Math.min(cw / w, ch / h);
    return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
  };

  if (options.layout === "horizontal" || options.layout === "vertical") {
    const horizontal = options.layout === "horizontal";
    // Normalize: scale all images so they share the cross dimension
    // (height for horizontal, width for vertical), preserving aspects.
    const targetCross = horizontal
      ? Math.min(...sizes.map((s) => s.height))
      : Math.min(...sizes.map((s) => s.width));
    const scaled = sizes.map((s) => {
      const k = horizontal ? targetCross / s.height : targetCross / s.width;
      return { width: Math.max(1, Math.round(s.width * k)), height: Math.max(1, Math.round(s.height * k)) };
    });
    const alongOf = (s: { width: number; height: number }) => (horizontal ? s.width : s.height);
    const crossOf = (s: { width: number; height: number }) => (horizontal ? s.height : s.width);
    const totalAlong = scaled.reduce((sum, s) => sum + alongOf(s), 0) + spacing * (n - 1);
    const maxCross = Math.max(...scaled.map(crossOf));
    const canvas = {
      width: (horizontal ? totalAlong : maxCross) + padding * 2,
      height: (horizontal ? maxCross : totalAlong) + padding * 2,
    };
    let cursor = padding;
    const cells: MergeCell[] = scaled.map((s) => {
      const along = alongOf(s);
      const cross = crossOf(s);
      const cell = {
        x: horizontal ? cursor : padding,
        y: horizontal ? padding : cursor,
        width: s.width,
        height: s.height,
      };
      // Alignment on the cross axis
      if (options.align === "center") {
        if (horizontal) cell.y = padding + (maxCross - cross) / 2;
        else cell.x = padding + (maxCross - cross) / 2;
      } else if (options.align === "end") {
        if (horizontal) cell.y = padding + maxCross - cross;
        else cell.x = padding + maxCross - cross;
      }
      cursor += along + spacing;
      return cell;
    });
    return { canvas, cells };
  }

  // Grid: uniform square-ish cells sized to the largest image aspect,
  // columns from options (clamped to n).
  const cols = clamp(options.columns, 1, n);
  const rows = Math.ceil(n / cols);
  const maxW = Math.max(...sizes.map((s) => s.width));
  const maxH = Math.max(...sizes.map((s) => s.height));
  // Use average aspect for cell shape
  const avgAspect =
    sizes.reduce((sum, s) => sum + s.width / s.height, 0) / n;
  const cellH = maxH;
  let cellW = Math.round(cellH * avgAspect);
  if (cellW > maxW * 1.5) cellW = Math.round(maxW * 1.5);
  const canvas = {
    width: cols * cellW + (cols - 1) * spacing + padding * 2,
    height: rows * cellH + (rows - 1) * spacing + padding * 2,
  };
  const cells: MergeCell[] = sizes.map((s, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const cell = {
      x: padding + c * (cellW + spacing),
      y: padding + r * (cellH + spacing),
      width: cellW,
      height: cellH,
    };
    const f = fit(s.width, s.height, cellW, cellH);
    // center within cell
    cell.x += (cellW - f.width) / 2;
    cell.y += (cellH - f.height) / 2;
    cell.width = f.width;
    cell.height = f.height;
    return cell;
  });
  return { canvas, cells };
}

/* ── Collage geometry ───────────────────────────────────── */

/**
 * Scale a template's unit-space cells to the canvas content box.
 * Spacing is a gutter *between* cells: each cell shrinks by the gutter
 * along edges that face another cell (fractional edges strictly inside
 * 0..1), and edge cells keep the outer boundary flush with the box.
 */
export function scaleCollageCells(
  cells: { x: number; y: number; w: number; h: number }[],
  contentWidth: number,
  contentHeight: number,
  spacing: number,
): MergeCell[] {
  if (cells.length === 0 || contentWidth <= 0 || contentHeight <= 0) return [];
  const gutter = Math.max(0, spacing);
  return cells.map((c) => {
    const insetLeft = c.x > 0.001 ? gutter : 0;
    const insetTop = c.y > 0.001 ? gutter : 0;
    const insetRight = c.x + c.w < 0.999 ? gutter : 0;
    const insetBottom = c.y + c.h < 0.999 ? gutter : 0;
    return {
      x: c.x * contentWidth + insetLeft,
      y: c.y * contentHeight + insetTop,
      width: Math.max(0, c.w * contentWidth - insetLeft - insetRight),
      height: Math.max(0, c.h * contentHeight - insetTop - insetBottom),
    };
  });
}

/* ── Layer helpers ──────────────────────────────────────── */

export function layerAt(
  layers: EditorLayer[],
  x: number,
  y: number,
): EditorLayer | null {
  // Topmost first (layers painted bottom→top, so iterate reversed).
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible) continue;
    const dx = x - layer.x;
    const dy = y - layer.y;
    const rad = (-layer.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    const w = layer.type === "text" ? layer.boxWidth : layer.width;
    const h =
      layer.type === "text"
        ? layer.fontSize * layer.lineHeight * 2
        : layer.type === "image"
          ? layer.height
          : layer.height;
    if (lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2) return layer;
  }
  return null;
}

export function moveLayer(
  layers: EditorLayer[],
  id: string,
  dx: number,
  dy: number,
): EditorLayer[] {
  return layers.map((l) =>
    l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l,
  );
}

/** Z-order operations. Returns a new array when changed. */
export function reorderLayer(
  layers: EditorLayer[],
  id: string,
  action: "forward" | "backward" | "front" | "back",
): EditorLayer[] {
  const index = layers.findIndex((l) => l.id === id);
  if (index === -1) return layers;
  const next = [...layers];
  const [layer] = next.splice(index, 1);
  switch (action) {
    case "forward":
      next.splice(Math.min(layers.length, index + 1), 0, layer);
      break;
    case "backward":
      next.splice(Math.max(0, index - 1), 0, layer);
      break;
    case "front":
      next.push(layer);
      break;
    case "back":
      next.unshift(layer);
      break;
  }
  return next;
}

/* ── Canvas / straighten ───────────────────────────────── */

/** Canvas size that fits a straightened (arbitrarily rotated) image. */
export function straightenCanvasSize(
  width: number,
  height: number,
  angleDeg: number,
): { width: number; height: number } {
  return rotatedBounds(width, height, angleDeg);
}

/** Fit an image into a canvas box with contain/cover/stretch semantics. */
export function fitImage(
  imageW: number,
  imageH: number,
  boxW: number,
  boxH: number,
  fit: "contain" | "cover" | "stretch",
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (fit === "stretch")
    return { width: boxW, height: boxH, offsetX: 0, offsetY: 0 };
  const scale =
    fit === "cover"
      ? Math.max(boxW / imageW, boxH / imageH)
      : Math.min(boxW / imageW, boxH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    width,
    height,
    offsetX: (boxW - width) / 2,
    offsetY: (boxH - height) / 2,
  };
}

export const SHAPE_KINDS: ShapeKind[] = ["rect", "ellipse", "triangle", "line"];

export type { ImageLayer, CanvasSpec };
