/**
 * Advanced Image Editor — data model.
 *
 * The whole editor is represented as a serializable EditorProject:
 * layers reference image *documents* (decoded bitmaps held outside React
 * state in a bitmap registry) and store all transform/appearance props as
 * plain data. This keeps history snapshots cheap (no full-resolution
 * pixel copies) and makes split/collage/merge computations pure functions
 * over these types.
 */

/* ── Shared layer primitives ─────────────────────────────── */

/** Geometry shared by every layer. Positions/sizes are in canvas pixels. */
export type LayerBase = {
  id: string;
  name: string;
  visible: boolean;
  /** Layer opacity 0..1 (applied at composite time). */
  opacity: number;
  /** Center position in canvas coordinates. */
  x: number;
  y: number;
  /** Clockwise rotation in degrees. */
  rotation: number;
  locked: boolean;
};

export type ImageFit = "contain" | "cover" | "stretch";

/** Transform + adjustments for image layers. */
export type ImageLayer = LayerBase & {
  type: "image";
  /** Registry key of the decoded bitmap (kept outside React state). */
  docId: string;
  /** Drawn width in canvas pixels (height derives from aspect unless stretched). */
  width: number;
  height: number;
  flipX: boolean;
  flipY: boolean;
  /** Crop rect in *source* pixel space; null = full image. */
  crop: { x: number; y: number; width: number; height: number } | null;
  fit: ImageFit;
  adjustments: ImageAdjustments;
  /** Name of an applied filter preset (null = none). Composable with adjustments. */
  filter: FilterPresetId | null;
  /** 0..1 blend of the filter preset over the adjusted image. */
  filterAmount: number;
};

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  /** Optional background box behind the text; null = none. */
  background: { color: string; padding: number; radius: number } | null;
  /** Optional outline (stroke). */
  outline: { color: string; width: number } | null;
  /** Optional drop shadow. */
  shadow: { color: string; blur: number; offsetX: number; offsetY: number } | null;
  /** Fixed box width in canvas px; text wraps inside it. */
  boxWidth: number;
};

export type ShapeKind = "rect" | "ellipse" | "triangle" | "line";

export type ShapeLayer = LayerBase & {
  type: "shape";
  shape: ShapeKind;
  width: number;
  height: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  radius: number;
};

export type EditorLayer = ImageLayer | TextLayer | ShapeLayer;

/* ── Adjustments & filters ───────────────────────────────── */

/**
 * All adjustments are stored as offsets/percent around a neutral value.
 * Rendering maps them to canvas filter strings + pixel math, so the same
 * values work for live preview (CSS-independent) and final export.
 */
export type ImageAdjustments = {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  exposure: number; // -100..100 (multiplier around 1)
  temperature: number; // -100..100 (cool→warm)
  tint: number; // -100..100 (green→magenta)
  highlights: number; // -100..100
  shadows: number; // -100..100
  sharpness: number; // 0..100 (unsharp mask amount)
  blur: number; // 0..100 → px
  grayscale: number; // 0..100
  opacity: number; // 0..100 (layer-level)
};

export const NEUTRAL_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  grayscale: 0,
  opacity: 100,
};

export type FilterPresetId =
  | "grayscale"
  | "sepia"
  | "vintage"
  | "warm"
  | "cool"
  | "high-contrast"
  | "fade"
  | "sharpen";

export type FilterPreset = {
  id: FilterPresetId;
  label: string;
  /** Partial adjustments applied when the preset is active. */
  adjustments: Partial<ImageAdjustments>;
};

/**
 * Filter presets. Each preset is a set of adjustment deltas so presets
 * compose with manual adjustments by simple addition (clamped) — no
 * duplicate filter engine needed.
 */
export const FILTER_PRESETS: FilterPreset[] = [
  { id: "grayscale", label: "Grayscale", adjustments: { grayscale: 100 } },
  { id: "sepia", label: "Sepia", adjustments: { saturation: -45, temperature: 28, tint: 12 } },
  { id: "vintage", label: "Vintage", adjustments: { saturation: -30, temperature: 20, contrast: -10, highlights: -10, shadows: 15 } },
  { id: "warm", label: "Warm", adjustments: { temperature: 35, saturation: 10 } },
  { id: "cool", label: "Cool", adjustments: { temperature: -35, saturation: 5 } },
  { id: "high-contrast", label: "High Contrast", adjustments: { contrast: 40, saturation: 10 } },
  { id: "fade", label: "Fade", adjustments: { contrast: -25, saturation: -20, exposure: 8 } },
  { id: "sharpen", label: "Sharpen", adjustments: { sharpness: 45 } },
];

/* ── Canvas / project ───────────────────────────────────── */

export type BorderStyle = "solid" | "dashed" | "dotted" | "double" | "none";

export type CanvasSpec = {
  width: number;
  height: number;
  /** Background color; "transparent" = no fill (PNG/WebP only). */
  background: string;
  /** Corner radius in px (clamped to half min dimension). */
  borderRadius: number;
  /** Padding between canvas edge and content box in px. */
  padding: number;
  border: {
    style: BorderStyle;
    color: string;
    width: number;
  };
  /** Aspect-ratio lock preset id (drives width↔height coupling). */
  aspectPreset: AspectPresetId;
};

export type AspectPresetId =
  | "free"
  | "original"
  | "1:1"
  | "4:3"
  | "3:4"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3";

export type EditorProject = {
  canvas: CanvasSpec;
  /** Bottom-to-top paint order (index 0 painted first / furthest back). */
  layers: EditorLayer[];
};

export const DEFAULT_CANVAS: CanvasSpec = {
  width: 1024,
  height: 1024,
  background: "transparent",
  borderRadius: 0,
  padding: 0,
  border: { style: "none", color: "#ffffff", width: 0 },
  aspectPreset: "original",
};

/* ── Multi-image workflows ──────────────────────────────── */

export type MergeLayout = "vertical" | "horizontal" | "grid";

export type MergeOptions = {
  layout: MergeLayout;
  /** Gap between images in px. */
  spacing: number;
  /** Outer padding in px. */
  padding: number;
  background: string;
  /** Alignment on the cross axis for horizontal/vertical layouts. */
  align: "start" | "center" | "end";
  /** Target cell size for grid layout (columns). */
  columns: number;
  /** Corner radius applied to each image cell. */
  cellRadius: number;
};

export type SplitMode = "rows" | "columns" | "grid";

export type SplitOptions = {
  mode: SplitMode;
  rows: number;
  columns: number;
  /** Evenly-sized split regions. When false, custom guide cuts are used. */
  evenly: boolean;
  /**
   * Custom cut positions in canvas px (used when `evenly` is false).
   * `guideX` = vertical cuts (distance from the left edge),
   * `guideY` = horizontal cuts (distance from the top edge).
   * Undefined falls back to the even grid positions.
   */
  guideX?: number[];
  guideY?: number[];
};

/** A computed output region of a split. Pure geometry, unit-tested. */
export type SplitRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/* ── Collage ─────────────────────────────────────────────── */

export type CollageTemplateId =
  | "grid-2"
  | "grid-3"
  | "grid-4"
  | "grid-6"
  | "grid-9"
  | "row-2"
  | "row-3"
  | "column-2"
  | "column-3"
  | "featured-left"
  | "featured-right"
  | "stack";

export type CollageTemplate = {
  id: CollageTemplateId;
  label: string;
  /** Number of image slots the template defines. */
  slots: number;
  /**
   * Fractional slot rects {x,y,w,h} in a 0..1 unit space; the renderer
   * scales them to the canvas content box. Pure data → easy to test.
   */
  cells: { x: number; y: number; w: number; h: number }[];
};

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  { id: "grid-2", label: "2 · Side by side", slots: 2, cells: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: "row-2", label: "2 · Stacked", slots: 2, cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] },
  { id: "grid-3", label: "3 · Row", slots: 3, cells: [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }] },
  { id: "column-3", label: "3 · Column", slots: 3, cells: [{ x: 0, y: 0, w: 1, h: 1 / 3 }, { x: 0, y: 1 / 3, w: 1, h: 1 / 3 }, { x: 0, y: 2 / 3, w: 1, h: 1 / 3 }] },
  { id: "grid-4", label: "4 · Grid", slots: 4, cells: [
    { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ] },
  { id: "row-3", label: "3 · One big + two", slots: 3, cells: [
    { x: 0, y: 0, w: 0.666, h: 1 }, { x: 0.666, y: 0, w: 0.334, h: 0.5 }, { x: 0.666, y: 0.5, w: 0.334, h: 0.5 },
  ] },
  { id: "grid-6", label: "6 · Grid", slots: 6, cells: [
    { x: 0, y: 0, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
    { x: 0, y: 0.5, w: 1 / 3, h: 0.5 }, { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 }, { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
  ] },
  { id: "grid-9", label: "9 · Grid", slots: 9, cells: Array.from({ length: 9 }, (_, i) => ({
    x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3,
  })) },
  { id: "column-2", label: "2 · Column", slots: 2, cells: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: "featured-left", label: "4 · Featured left", slots: 4, cells: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 / 3 }, { x: 0.5, y: 1 / 3, w: 0.5, h: 1 / 3 }, { x: 0.5, y: 2 / 3, w: 0.5, h: 1 / 3 },
  ] },
  { id: "featured-right", label: "4 · Featured right", slots: 4, cells: [
    { x: 0.5, y: 0, w: 0.5, h: 1 },
    { x: 0, y: 0, w: 0.5, h: 1 / 3 }, { x: 0, y: 1 / 3, w: 0.5, h: 1 / 3 }, { x: 0, y: 2 / 3, w: 0.5, h: 1 / 3 },
  ] },
  { id: "stack", label: "2 · Overlap", slots: 2, cells: [
    { x: 0, y: 0, w: 0.75, h: 0.75 }, { x: 0.25, y: 0.25, w: 0.75, h: 0.75 },
  ] },
];

/** Per-slot crop/zoom of an image inside a collage cell. */
export type CollageSlotState = {
  /** Registry docId of the image in this slot. */
  docId: string | null;
  /** Zoom multiplier ≥1 applied after contain-fit. */
  zoom: number;
  /** Pan offsets in cell-normalized units (-1..1 of the cell). */
  offsetX: number;
  offsetY: number;
  /** 0..1 — how much of this cell is covered by the image (for overlap templates). */
  opacity: number;
};

export type CollageState = {
  templateId: CollageTemplateId;
  spacing: number;
  padding: number;
  background: string;
  cellRadius: number;
  slots: CollageSlotState[];
};

/* ── Export ─────────────────────────────────────────────── */

export type ExportFormat = "png" | "jpeg" | "webp";

export type ExportConfig = {
  format: ExportFormat;
  /** JPEG/WebP quality 1..100. */
  quality: number;
  /** Output scale multiplier (0.1..2) applied to canvas dimensions. */
  scale: number;
  /** When true, exports all layers individually instead of the composite. */
  filename: string;
};

/* ── Helpers ────────────────────────────────────────────── */

export function layerBounds(layer: EditorLayer): { width: number; height: number } {
  switch (layer.type) {
    case "image":
      return { width: layer.width, height: layer.height };
    case "shape":
      return { width: layer.width, height: layer.height };
    case "text": {
      // Box width drives wrap; height estimated by renderer. For layout
      // purposes the text layer's drawn extent is measured lazily; callers
      // that need exact bounds use measureTextLayer().
      return { width: layer.boxWidth, height: layer.fontSize * layer.lineHeight * 2 };
    }
  }
}

export function isEditorProject(value: unknown): value is EditorProject {
  const v = value as EditorProject;
  return (
    !!v &&
    typeof v === "object" &&
    typeof v.canvas?.width === "number" &&
    Array.isArray(v.layers)
  );
}
