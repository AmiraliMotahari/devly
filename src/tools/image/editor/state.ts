/**
 * Editor state: reducer + history (undo/redo/reset).
 *
 * History stores project snapshots (plain data — layers reference
 * bitmaps by docId, never pixel copies). Slider drags coalesce into a
 * single history entry via `transient` flags so undo isn't flooded.
 */

import type {
  EditorProject,
  EditorLayer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  CanvasSpec,
  ImageAdjustments,
  FilterPresetId,
  CollageState,
  CollageTemplateId,
  CollageSlotState,
} from "../types/editor";
import { NEUTRAL_ADJUSTMENTS, DEFAULT_CANVAS } from "../types/editor";

export const HISTORY_LIMIT = 40;

export type EditorMode =
  | "select"    // move/resize layers
  | "crop"      // crop the selected/base image
  | "adjust"    // adjustments panel focus
  | "filters"   // filter presets
  | "text"      // add/edit text layers
  | "elements"  // shapes & image overlays
  | "canvas"    // canvas/border/background
  | "background-removal"
  | "merge"
  | "split"
  | "collage";

export type EditorState = {
  project: EditorProject;
  mode: EditorMode;
  selectedLayerId: string | null;
  history: {
    past: EditorProject[];
    future: EditorProject[];
  };
  ui: {
    zoom: number;
    fitZoom: boolean;
    showGuides: boolean;
    /** True while a transient (slider/drag) interaction is in progress. */
    transientSession: boolean;
  };
  collage: CollageState | null;
};

/* ── Actions ────────────────────────────────────────────── */

export type EditorAction =
  | { type: "set-mode"; mode: EditorMode }
  | { type: "select-layer"; id: string | null }
  | { type: "add-layer"; layer: EditorLayer; select?: boolean }
  | { type: "update-layer"; id: string; patch: Partial<EditorLayer>; transient?: boolean }
  | { type: "update-layer-adjustments"; id: string; patch: Partial<ImageAdjustments>; transient?: boolean }
  | { type: "set-filter"; id: string; filter: FilterPresetId | null; amount?: number; transient?: boolean }
  | { type: "remove-layer"; id: string }
  | { type: "duplicate-layer"; id: string }
  | { type: "reorder-layer"; id: string; action: "forward" | "backward" | "front" | "back" }
  | { type: "move-layer-by"; id: string; dx: number; dy: number; transient?: boolean }
  | { type: "set-canvas"; patch: Partial<CanvasSpec>; transient?: boolean }
  | { type: "crop-canvas"; layerId: string; crop: { x: number; y: number; width: number; height: number }; canvasWidth: number; canvasHeight: number; originX: number; originY: number }
  | { type: "set-zoom"; zoom: number }
  | { type: "set-fit-zoom"; fit: boolean }
  | { type: "toggle-guides" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "commit" } // close a transient (slider) history entry
  | { type: "load-project"; project: EditorProject; collage?: CollageState | null }
  | { type: "set-collage"; patch: Partial<CollageState> }
  | { type: "init-collage"; slots: CollageSlotState[]; templateId?: CollageTemplateId }
  | { type: "set-collage-template"; id: CollageTemplateId }
  | { type: "set-collage-slot"; index: number; patch: Partial<CollageSlotState>; transient?: boolean }
  | { type: "swap-collage-slots"; a: number; b: number };

/* ── History helpers ───────────────────────────────────── */

/**
 * Push the *current* project onto the past stack before a change is
 * applied (callers compute the new project from `state.project`).
 */
function pushHistory(state: EditorState, next: EditorState): EditorState {
  const past = [...state.history.past, state.project].slice(-HISTORY_LIMIT);
  return { ...next, history: { past, future: [] } };
}

/**
 * Apply a project change. `transient: true` means the change is part of
 * an in-progress interaction (slider drag): the FIRST transient change
 * pushes the pre-interaction project onto the past stack and flags the
 * state as transient; subsequent transient changes just update the
 * project; `commit` clears the flag.
 */
function withProject(
  state: EditorState,
  project: EditorProject,
  transient?: boolean,
): EditorState {
  if (project === state.project) return state;
  if (transient) {
    if (state.ui.transientSession) {
      // Continuation of the same interaction.
      return { ...state, project };
    }
    // First transient change: snapshot the pre-interaction project.
    return {
      ...state,
      project,
      history: {
        past: [...state.history.past, state.project].slice(-HISTORY_LIMIT),
        future: [],
      },
      ui: { ...state.ui, transientSession: true },
    };
  }
  const next = pushHistory(state, { ...state, project });
  return {
    ...next,
    ui: { ...next.ui, transientSession: false },
  };
}

/* ── Reducer ────────────────────────────────────────────── */

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set-mode":
      return { ...state, mode: action.mode };

    case "select-layer":
      return { ...state, selectedLayerId: action.id };

    case "add-layer": {
      const project = {
        ...state.project,
        layers: [...state.project.layers, action.layer],
      };
      return pushHistory(state, {
        ...state,
        project,
        selectedLayerId: action.select === false ? state.selectedLayerId : action.layer.id,
      });
    }

    case "update-layer": {
      const layers = state.project.layers.map((l) =>
        l.id === action.id ? ({ ...l, ...action.patch } as EditorLayer) : l,
      );
      return withProject(state, { ...state.project, layers }, action.transient);
    }

    case "update-layer-adjustments": {
      const target = state.project.layers.find((l) => l.id === action.id);
      if (!target || target.type !== "image") return state;
      const layers = state.project.layers.map((l) =>
        l.id === action.id && l.type === "image"
          ? { ...l, adjustments: { ...l.adjustments, ...action.patch } }
          : l,
      );
      return withProject(state, { ...state.project, layers }, action.transient);
    }

    case "set-filter": {
      const target = state.project.layers.find((l) => l.id === action.id);
      if (!target || target.type !== "image") return state;
      const layers = state.project.layers.map((l) => {
        if (l.id !== action.id || l.type !== "image") return l;
        return {
          ...l,
          filter: action.filter,
          filterAmount: action.amount ?? l.filterAmount,
        };
      });
      return withProject(state, { ...state.project, layers }, action.transient);
    }

    case "remove-layer": {
      const layers = state.project.layers.filter((l) => l.id !== action.id);
      const selected =
        state.selectedLayerId === action.id ? null : state.selectedLayerId;
      return pushHistory(state, { ...state, project: { ...state.project, layers }, selectedLayerId: selected });
    }

    case "duplicate-layer": {
      const index = state.project.layers.findIndex((l) => l.id === action.id);
      if (index === -1) return state;
      const source = state.project.layers[index];
      const copy: EditorLayer = {
        ...source,
        id: `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `${source.name} copy`,
        x: source.x + 24,
        y: source.y + 24,
      };
      const layers = [...state.project.layers];
      layers.splice(index + 1, 0, copy);
      return pushHistory(state, {
        ...state,
        project: { ...state.project, layers },
        selectedLayerId: copy.id,
      });
    }

    case "reorder-layer": {
      const index = state.project.layers.findIndex((l) => l.id === action.id);
      if (index === -1) return state;
      const layers = [...state.project.layers];
      const [layer] = layers.splice(index, 1);
      let target = index;
      if (action.action === "forward") target = Math.min(layers.length, index + 1);
      if (action.action === "backward") target = Math.max(0, index - 1);
      if (action.action === "front") target = layers.length;
      if (action.action === "back") target = 0;
      layers.splice(target, 0, layer);
      return pushHistory(state, { ...state, project: { ...state.project, layers } });
    }

    case "move-layer-by": {
      const layers = state.project.layers.map((l) =>
        l.id === action.id ? { ...l, x: l.x + action.dx, y: l.y + action.dy } : l,
      );
      return withProject(state, { ...state.project, layers }, action.transient);
    }

    case "set-canvas":
      return withProject(
        state,
        { ...state.project, canvas: { ...state.project.canvas, ...action.patch } },
        action.transient,
      );

    case "crop-canvas": {
      // Crop one image layer AND the canvas in a single atomic step:
      // - target layer gets the source-space crop + resized drawn box
      // - other layers shift by the crop origin (their relative position
      //   on the kept region is preserved)
      // - canvas resizes to the crop
      const { layerId, crop, canvasWidth, canvasHeight, originX, originY } = action;
      const layers = state.project.layers.map((l) => {
        if (l.id !== layerId) {
          // Re-anchor overlays: canvas coords shrink by the origin delta.
          return { ...l, x: l.x - originX, y: l.y - originY };
        }
        if (l.type !== "image") return l;
        return {
          ...l,
          crop,
          width: canvasWidth,
          height: canvasHeight,
          x: canvasWidth / 2,
          y: canvasHeight / 2,
        };
      });
      const project: EditorProject = {
        ...state.project,
        canvas: { ...state.project.canvas, width: canvasWidth, height: canvasHeight },
        layers,
      };
      return pushHistory(state, { ...state, project });
    }

    case "set-zoom":
      return { ...state, ui: { ...state.ui, zoom: clampZoom(action.zoom), fitZoom: false } };

    case "set-fit-zoom":
      return { ...state, ui: { ...state.ui, fitZoom: action.fit } };

    case "toggle-guides":
      return { ...state, ui: { ...state.ui, showGuides: !state.ui.showGuides } };

    case "undo": {
      const { past, future } = state.history;
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      return {
        ...state,
        project: previous,
        history: {
          past: past.slice(0, -1),
          future: [state.project, ...future].slice(0, HISTORY_LIMIT),
        },
      };
    }

    case "redo": {
      const { past, future } = state.history;
      if (future.length === 0) return state;
      const next = future[0];
      return {
        ...state,
        project: next,
        history: {
          past: [...past, state.project].slice(-HISTORY_LIMIT),
          future: future.slice(1),
        },
      };
    }

    case "reset":
      return pushHistory(state, {
        ...state,
        project: {
          canvas: { ...DEFAULT_CANVAS, width: state.project.canvas.width, height: state.project.canvas.height },
          layers: [],
        },
        selectedLayerId: null,
      });

    case "commit":
      // Close a transient interaction (the pre-interaction snapshot was
      // already pushed by the first transient change).
      return state.ui.transientSession
        ? { ...state, ui: { ...state.ui, transientSession: false } }
        : state;

    case "load-project":
      return pushHistory(state, {
        ...state,
        project: action.project,
        collage: action.collage ?? state.collage,
        selectedLayerId: null,
      });

    case "init-collage": {
      if (state.collage) {
        // Already initialized — just sync slots if provided.
        return { ...state, collage: { ...state.collage, slots: action.slots } };
      }
      return {
        ...state,
        collage: {
          templateId: action.templateId ?? "grid-4",
          spacing: 12,
          padding: 12,
          background: "#ffffff",
          cellRadius: 8,
          slots: action.slots,
        },
      };
    }

    case "set-collage": {
      if (!state.collage) return state;
      const collage = { ...state.collage, ...action.patch };
      return { ...state, collage };
    }

    case "set-collage-template": {
      if (!state.collage) return state;
      const template = action.id;
      const slotsNeeded = COLLAGE_SLOT_COUNTS[template] ?? state.collage.slots.length;
      const slots = [...state.collage.slots];
      while (slots.length < slotsNeeded)
        slots.push({ docId: null, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 });
      slots.length = slotsNeeded;
      return { ...state, collage: { ...state.collage, templateId: template, slots } };
    }

    case "set-collage-slot": {
      if (!state.collage) return state;
      const slots = state.collage.slots.map((s, i) =>
        i === action.index ? { ...s, ...action.patch } : s,
      );
      return { ...state, collage: { ...state.collage, slots } };
    }

    case "swap-collage-slots": {
      if (!state.collage) return state;
      const { a, b } = action;
      const len = state.collage.slots.length;
      if (a === b || a < 0 || b < 0 || a >= len || b >= len) return state;
      const slots = [...state.collage.slots];
      [slots[a], slots[b]] = [slots[b], slots[a]];
      return { ...state, collage: { ...state.collage, slots } };
    }

    default:
      return state;
  }
}

function clampZoom(zoom: number): number {
  return Math.min(8, Math.max(0.05, zoom));
}

/** Slot counts per template (mirrors COLLAGE_TEMPLATES for the reducer). */
export const COLLAGE_SLOT_COUNTS: Record<CollageTemplateId, number> = {
  "grid-2": 2,
  "grid-3": 3,
  "grid-4": 4,
  "grid-6": 6,
  "grid-9": 9,
  "row-2": 2,
  "row-3": 3,
  "column-2": 2,
  "column-3": 3,
  "featured-left": 4,
  "featured-right": 4,
  stack: 2,
};

/* ── Factories ──────────────────────────────────────────── */

let layerCounter = 0;
export function nextLayerId(type: EditorLayer["type"]): string {
  layerCounter += 1;
  return `${type}-${Date.now().toString(36)}-${layerCounter}`;
}

export function makeImageLayer(
  docId: string,
  name: string,
  width: number,
  height: number,
  canvasW: number,
  canvasH: number,
): ImageLayer {
  // Fit into 90% of the canvas, centered.
  const scale = Math.min((canvasW * 0.9) / width, (canvasH * 0.9) / height, 1);
  return {
    type: "image",
    id: nextLayerId("image"),
    name,
    visible: true,
    opacity: 1,
    x: canvasW / 2,
    y: canvasH / 2,
    rotation: 0,
    locked: false,
    docId,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    flipX: false,
    flipY: false,
    crop: null,
    fit: "contain",
    adjustments: { ...NEUTRAL_ADJUSTMENTS },
    filter: null,
    filterAmount: 1,
  };
}

export function makeTextLayer(canvasW: number, canvasH: number): TextLayer {
  return {
    type: "text",
    id: nextLayerId("text"),
    name: "Text",
    visible: true,
    opacity: 1,
    x: canvasW / 2,
    y: canvasH / 2,
    rotation: 0,
    locked: false,
    text: "Double-click to edit",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: Math.max(16, Math.round(canvasW / 18)),
    fontWeight: 700,
    italic: false,
    color: "#1f2937",
    align: "center",
    lineHeight: 1.3,
    letterSpacing: 0,
    background: null,
    outline: null,
    shadow: null,
    boxWidth: Math.round(canvasW * 0.6),
  };
}

export function makeShapeLayer(
  shape: ShapeLayer["shape"],
  canvasW: number,
  canvasH: number,
): ShapeLayer {
  return {
    type: "shape",
    id: nextLayerId("shape"),
    name: shape.charAt(0).toUpperCase() + shape.slice(1),
    visible: true,
    opacity: 1,
    x: canvasW / 2,
    y: canvasH / 2,
    rotation: 0,
    locked: false,
    shape,
    width: Math.round(canvasW * 0.3),
    height: Math.round(canvasW * 0.3),
    fill: "#6366f1",
    stroke: null,
    strokeWidth: 0,
    radius: shape === "rect" ? 8 : 0,
  };
}

export function initialEditorState(
  project?: Partial<EditorProject>,
): EditorState {
  return {
    project: {
      canvas: { ...DEFAULT_CANVAS, ...project?.canvas },
      layers: project?.layers ?? [],
    },
    mode: "select",
    selectedLayerId: null,
    history: { past: [], future: [] },
    ui: { zoom: 1, fitZoom: true, showGuides: false, transientSession: false },
    collage: null,
  };
}
