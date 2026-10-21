/**
 * Export pipeline: composite render → encode → ToolResult-like outputs.
 * Split/merge/collage produce multiple files; single-edit produces one.
 */

import type {
  EditorProject,
  ExportConfig,
  ExportFormat,
  SplitOptions,
  SplitRegion,
  MergeOptions,
  CollageState,
  CollageTemplateId,
} from "../types/editor";
import { renderToCanvas, canvasToBlob, renderProject, BitmapRegistry } from "./render";
import { computeSplitRegions, computeMergeLayout, scaleCollageCells, clamp } from "./geometry";
import type { ImageLayer as ImageProjectLayer } from "../types/editor";
import { COLLAGE_TEMPLATES } from "../types/editor";
import { replaceExtension } from "@/lib/file-security";

/**
 * Package multiple export files into a single ZIP (JSZip is a runtime dep).
 * Returns null when the archive would be a single file (no wrapping needed).
 */
export async function zipExportFiles(files: ExportFile[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.filename, f.blob);
  }
  return zip.generateAsync({ type: "blob" });
};

export const FORMAT_MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const FORMAT_EXTENSION: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

export type ExportFile = {
  filename: string;
  blob: Blob;
};

export type ExportResult = {
  files: ExportFile[];
  width: number;
  height: number;
};

/** Check if a format supports transparency. */
export function formatSupportsAlpha(format: ExportFormat): boolean {
  return format !== "jpeg";
}

/** Validate + normalize an export configuration. */
export function normalizeExportConfig(config: Partial<ExportConfig>): ExportConfig {
  const format = (config.format ?? "png") as ExportFormat;
  const quality = clamp(Math.round(config.quality ?? 92), 1, 100);
  const scale = clamp(config.scale ?? 1, 0.1, 2);
  let filename = (config.filename ?? "edited").trim();
  if (!filename) filename = "edited";
  return {
    format,
    quality,
    scale,
    filename: sanitizeExportFilename(filename, format),
  };
}

function sanitizeExportFilename(name: string, format: ExportFormat): string {
  const ext = FORMAT_EXTENSION[format];
  const base = name.replace(/\.[a-z0-9]+$/i, "");
  const safe =
    base
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/_{2,}/g, "_")
      .replace(/-{2,}/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 180) || "edited";
  return `${safe}.${ext}`;
}

/** JPEG can't hold alpha: warn (handled by callers) when canvas is transparent. */
export function exportHasAlphaRisk(project: EditorProject, format: ExportFormat): boolean {
  return (
    format === "jpeg" &&
    project.canvas.background === "transparent" &&
    project.layers.some((l) => l.type === "image" && (l.fit === "cover" || l.crop !== null) && l.adjustments.opacity === 100)
  );
}

/** Export the composite canvas. */
export async function exportProject(
  project: EditorProject,
  registry: BitmapRegistry,
  config: ExportConfig,
): Promise<ExportResult> {
  const cfg = normalizeExportConfig(config);
  const cnv = renderToCanvas(project, registry, cfg.scale);
  // JPEG: flatten transparency to white to avoid black output.
  if (cfg.format === "jpeg" && project.canvas.background === "transparent") {
    const ctx = cnv.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cnv.width, cnv.height);
    ctx.globalCompositeOperation = "source-over";
  }
  const blob = await canvasToBlob(cnv, FORMAT_MIME[cfg.format], cfg.quality / 100);
  return {
    files: [{ filename: cfg.filename, blob }],
    width: cnv.width,
    height: cnv.height,
  };
}

/** Export split regions as separate files. */
export async function exportSplit(
  project: EditorProject,
  registry: BitmapRegistry,
  options: SplitOptions,
  config: ExportConfig,
): Promise<ExportResult> {
  const cfg = normalizeExportConfig(config);
  const regions = computeSplitRegions(
    project.canvas.width,
    project.canvas.height,
    options,
  );
  const full = renderToCanvas(project, registry, 1);
  const files: ExportFile[] = [];
  for (const region of regions) {
    const slice = document.createElement("canvas");
    slice.width = Math.max(1, Math.round(region.width * cfg.scale));
    slice.height = Math.max(1, Math.round(region.height * cfg.scale));
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for split export.");
    ctx.drawImage(
      full,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      slice.width,
      slice.height,
    );
    if (cfg.format === "jpeg") flattenToWhite(ctx);
    const blob = await canvasToBlob(slice, FORMAT_MIME[cfg.format], cfg.quality / 100);
    files.push({
      filename: numberedFilename(cfg.filename, region, region.id, files.length),
      blob,
    });
  }
  return { files, width: full.width, height: full.height };
}

function numberedFilename(
  filename: string,
  _region: SplitRegion,
  id: string,
  index: number,
): string {
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot + 1) : "png";
  const n = String(index + 1).padStart(2, "0");
  void id;
  return `${base}-${n}.${ext}`;
}

function flattenToWhite(ctx: CanvasRenderingContext2D): void {
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = "source-over";
}

/* ── Merge (multiple images → one) ───────────────────────── */

export type MergeImage = { docId: string } | { doc: NonNullable<ReturnType<BitmapRegistry["get"]>> };

/** Normalize merge inputs (docIds or resolved docs) to a doc list. */
function resolveMergeDocs(
  images: { docId: string }[],
  registry: BitmapRegistry,
): NonNullable<ReturnType<BitmapRegistry["get"]>>[] {
  return images
    .map((i) => registry.get(i.docId))
    .filter((d): d is NonNullable<typeof d> => !!d);
}

/**
 * Build the merge layout as an editable EditorProject (used both by export
 * and by "Open in editor" so the result is re-editable with layers intact).
 * Pure w.r.t. the registry — no bitmaps are created or released.
 */
export function buildMergeProject(
  images: { docId: string }[],
  registry: BitmapRegistry,
  options: MergeOptions,
): EditorProject {
  const docs = resolveMergeDocs(images, registry);
  if (docs.length === 0) throw new Error("No images to merge.");
  const sizes = docs.map((d) => ({ width: d.width, height: d.height }));
  const layout = computeMergeLayout(sizes, options);
  return {
    canvas: {
      width: Math.round(layout.canvas.width),
      height: Math.round(layout.canvas.height),
      background: options.background,
      borderRadius: options.cellRadius,
      padding: 0,
      border: { style: "none", color: "#ffffff", width: 0 },
      aspectPreset: "free",
    },
    layers: docs.map((doc, i) => {
      const cell = layout.cells[i];
      const layer: ImageProjectLayer = {
        type: "image",
        id: `merge-${doc.id}-${i}`,
        name: doc.name,
        visible: true,
        opacity: 1,
        x: cell.x + cell.width / 2,
        y: cell.y + cell.height / 2,
        rotation: 0,
        locked: false,
        docId: doc.id,
        width: cell.width,
        height: cell.height,
        flipX: false,
        flipY: false,
        crop: null,
        fit: "contain",
        adjustments: neutralAdjustments(),
        filter: null,
        filterAmount: 1,
      };
      return layer;
    }),
  };
}

export async function exportMerge(
  images: { docId: string }[],
  registry: BitmapRegistry,
  options: MergeOptions,
  config: ExportConfig,
): Promise<ExportResult> {
  const project = buildMergeProject(images, registry, options);
  return exportProject(project, registry, config);
}

function neutralAdjustments() {
  return {
    brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0,
    tint: 0, highlights: 0, shadows: 0, sharpness: 0, blur: 0, grayscale: 0,
    opacity: 100,
  };
}

/* ── Collage ─────────────────────────────────────────────── */

export type CollageSlotSpec = {
  docId: string | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

/** A bitmap produced for one render call; caller must release() it. */
export type ScratchBitmap = {
  id: string;
  width: number;
  height: number;
  get: () => CanvasImageSource;
  release: () => void;
};

/**
 * Build the collage as an EditorProject. Pure with respect to the shared
 * registry — per-cell rounded clipping bakes temporary bitmaps that the
 * caller must release via the returned `scratch` list (never registered,
 * so undo/history stays unaffected and nothing leaks).
 */
export function buildCollageProject(
  slots: CollageSlotSpec[],
  templateId: CollageTemplateId,
  state: Omit<CollageState, "templateId" | "slots">,
  baseWidth: number,
  baseHeight: number,
  registry: BitmapRegistry,
): { project: EditorProject; scratch: ScratchBitmap[]; subs: Map<string, ScratchBitmap> } {
  const template = COLLAGE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Unknown collage template.");
  const scratch: ScratchBitmap[] = [];
  const subs = new Map<string, ScratchBitmap>();
  const contentW = Math.max(1, baseWidth - state.padding * 2);
  const contentH = Math.max(1, baseHeight - state.padding * 2);
  const cells = scaleCollageCells(template.cells, contentW, contentH, state.spacing);
  const layers: EditorProject["layers"] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const slot = slots[i];
    if (!slot?.docId) continue; // empty slot → background shows through
    const doc = registry.get(slot.docId);
    if (!doc) continue;
    const containScale = Math.min(
      (cell.width || 1) / doc.width,
      (cell.height || 1) / doc.height,
    );
    const scale = containScale * Math.max(1, slot.zoom);
    const width = doc.width * scale;
    const height = doc.height * scale;
    layers.push({
      type: "image",
      id: `collage-${i}-${slot.docId}`,
      name: `Slot ${i + 1}`,
      visible: true,
      opacity: 1,
      x: cell.x + cell.width / 2 + (cell.width - width) / 2 + slot.offsetX * cell.width,
      y: cell.y + cell.height / 2 + (cell.height - height) / 2 + slot.offsetY * cell.height,
      rotation: 0,
      locked: false,
      docId: slot.docId,
      width,
      height,
      flipX: false,
      flipY: false,
      crop: null,
      fit: "stretch",
      adjustments: neutralAdjustments(),
      filter: null,
      filterAmount: 1,
    });
  }
  const project: EditorProject = {
    canvas: {
      width: baseWidth,
      height: baseHeight,
      background: state.background,
      borderRadius: 0, // cell rounding is applied per-image below
      padding: 0, // padding already accounted for in the content box
      border: { style: "none", color: "#ffffff", width: 0 },
      aspectPreset: "free",
    },
    layers,
  };
  if (state.cellRadius > 0) {
    roundCollageCells(project, cells, state.cellRadius, registry, scratch, subs);
  }
  return { project, scratch, subs };
}

/** Release all scratch bitmaps produced by buildCollageProject. */
export function releaseScratchBitmaps(scratch: ScratchBitmap[]): void {
  for (const b of scratch) b.release();
}

/**
 * Clip each collage image to its (rounded) cell rect by re-drawing through
 * a mask into a temp canvas, then swapping the layer's docId to the temp
 * bitmap. Temp bitmaps are tracked in `scratch` (NOT the registry) and
 * must be released by the caller after rendering.
 */
function roundCollageCells(
  project: EditorProject,
  cells: { x: number; y: number; width: number; height: number }[],
  radius: number,
  registry: BitmapRegistry,
  scratch: ScratchBitmap[],
  subs: Map<string, ScratchBitmap>,
): void {
  for (let i = 0; i < project.layers.length; i++) {
    const layer = project.layers[i];
    if (layer.type !== "image") continue;
    // Cells and layers are index-aligned only for filled slots: find the
    // cell matching this layer's id suffix (collage-<i>-...).
    const match = /collage-(\d+)-/.exec(layer.id);
    if (!match) continue;
    const cell = cells[Number(match[1])];
    if (!cell) continue;
    const doc = registry.get(layer.docId);
    if (!doc) continue;
    const cnv = document.createElement("canvas");
    cnv.width = Math.max(1, Math.round(layer.width));
    cnv.height = Math.max(1, Math.round(layer.height));
    const ctx = cnv.getContext("2d");
    if (!ctx) continue;
    // Rounded cell rect in this layer's local coordinates.
    const clipX = cell.x - (layer.x - layer.width / 2);
    const clipY = cell.y - (layer.y - layer.height / 2);
    const clipW = cell.width;
    const clipH = cell.height;
    const r = Math.min(radius, clipW / 2, clipH / 2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(clipX + r, clipY);
    ctx.arcTo(clipX + clipW, clipY, clipX + clipW, clipY + clipH, r);
    ctx.arcTo(clipX + clipW, clipY + clipH, clipX, clipY + clipH, r);
    ctx.arcTo(clipX, clipY + clipH, clipX, clipY, r);
    ctx.arcTo(clipX, clipY, clipX + clipW, clipY, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      doc.get(),
      0, 0, doc.width, doc.height,
      0, 0, cnv.width, cnv.height,
    );
    ctx.restore();
    // Keep the temp canvas alive through the scratch list; the renderer
    // substitutes it via the explicit substitutions map at draw time.
    const temp: ScratchBitmap = {
      id: `${layer.docId}-rounded-${i}`,
      width: cnv.width,
      height: cnv.height,
      get: () => cnv,
      release: () => {
        cnv.width = 0;
        cnv.height = 0;
      },
    };
    scratch.push(temp);
    subs.set(layer.id, temp);
  }
}

/**
 * Render a collage project (as built by buildCollageProject) to a canvas
 * context, substituting rounded temp bitmaps for the given layers.
 * `subs` maps layer.id → ScratchBitmap from buildCollageProject.
 */
export function renderCollageProject(
  ctx: CanvasRenderingContext2D,
  project: EditorProject,
  registry: BitmapRegistry,
  subs: Map<string, ScratchBitmap>,
  options: { scale?: number; fast?: boolean } = {},
): void {
  if (subs.size === 0) {
    renderProject(ctx, project, registry, options);
    return;
  }
  // Transient registry view: original docs + temp substitutions under the
  // layer's docId (temp shadows the original for that id).
  const view = new BitmapRegistry();
  for (const doc of registry.list()) view.add(doc);
  for (const [layerId, temp] of subs) {
    const layer = project.layers.find(
      (l): l is ImageProjectLayer => l.id === layerId && l.type === "image",
    );
    if (!layer) continue;
    // The temp's canvas source carries width/height (an HTMLCanvasElement).
    const source = temp.get() as HTMLCanvasElement;
    view.add({
      id: layer.docId,
      name: `rounded-${layerId}`,
      width: temp.width,
      height: temp.height,
      type: "image/png",
      size: 0,
      get: () => source,
      release: () => temp.release(),
    });
  }
  renderProject(ctx, project, view, options);
}

export async function exportCollage(
  slots: CollageSlotSpec[],
  templateId: CollageTemplateId,
  state: Omit<CollageState, "templateId" | "slots">,
  baseWidth: number,
  baseHeight: number,
  registry: BitmapRegistry,
  config: ExportConfig,
): Promise<ExportResult> {
  const cfg = normalizeExportConfig(config);
  const { project, scratch, subs } = buildCollageProject(
    slots, templateId, state, baseWidth, baseHeight, registry,
  );
  try {
    const cnv = document.createElement("canvas");
    cnv.width = Math.max(1, Math.round(project.canvas.width * cfg.scale));
    cnv.height = Math.max(1, Math.round(project.canvas.height * cfg.scale));
    const ctx = cnv.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for collage export.");
    renderCollageProject(ctx, project, registry, subs, { scale: cfg.scale });
    if (cfg.format === "jpeg" && project.canvas.background === "transparent") {
      flattenToWhite(ctx);
    }
    const blob = await canvasToBlob(cnv, FORMAT_MIME[cfg.format], cfg.quality / 100);
    return {
      files: [{ filename: cfg.filename, blob }],
      width: cnv.width,
      height: cnv.height,
    };
  } finally {
    releaseScratchBitmaps(scratch);
  }
}

export { replaceExtension };
