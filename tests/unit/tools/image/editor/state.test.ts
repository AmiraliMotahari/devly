import { describe, expect, it } from "vitest";
import {
  editorReducer,
  initialEditorState,
  makeImageLayer,
  makeTextLayer,
  makeShapeLayer,
  HISTORY_LIMIT,
  type EditorState,
} from "@/tools/image/editor/state";
import type { ImageLayer, EditorLayer, CollageTemplateId, CollageSlotState } from "@/tools/image/types/editor";

const CANVAS = { width: 800, height: 600, background: "#fff", borderRadius: 0, padding: 0, border: { style: "none" as const, color: "#fff", width: 0 }, aspectPreset: "original" as const };

function stateWithLayers(layers: EditorLayer[]): EditorState {
  return { ...initialEditorState({ canvas: CANVAS, layers }) };
}

describe("editorReducer — history", () => {
  it("starts with empty history", () => {
    const s = initialEditorState();
    expect(s.history.past).toHaveLength(0);
    expect(s.history.future).toHaveLength(0);
  });

  it("add-layer pushes history", () => {
    const s = stateWithLayers([]);
    const next = editorReducer(s, {
      type: "add-layer",
      layer: makeImageLayer("doc-1", "a.png", 100, 50, CANVAS.width, CANVAS.height),
    });
    expect(next.project.layers).toHaveLength(1);
    expect(next.history.past).toHaveLength(1);
    expect(next.selectedLayerId).toBeTruthy();
  });

  it("undo restores previous project, redo re-applies", () => {
    const s0 = stateWithLayers([]);
    const s1 = editorReducer(s0, { type: "add-layer", layer: makeImageLayer("d", "a.png", 10, 10, 800, 600) });
    const s2 = editorReducer(s1, { type: "add-layer", layer: makeImageLayer("d2", "b.png", 10, 10, 800, 600) });
    const undone = editorReducer(s2, { type: "undo" });
    expect(undone.project.layers).toHaveLength(1);
    const redone = editorReducer(undone, { type: "redo" });
    expect(redone.project.layers).toHaveLength(2);
    expect(redone.project).toBe(s2.project);
  });

  it("transient updates push one history entry per interaction", () => {
    // Note: makeImageLayer centers the layer (x = canvasW/2 = 400).
    const base = makeImageLayer("d", "a.png", 100, 100, 800, 600);
    const startX = base.x; // 400
    const s0 = stateWithLayers([base]);
    const id = base.id;
    const s1 = editorReducer(s0, { type: "update-layer", id, patch: { x: 200 }, transient: true });
    expect(s1.project.layers[0].x).toBe(200);
    // First transient change snapshots the pre-interaction project
    expect(s1.history.past).toHaveLength(1);
    expect(s1.history.past[0].layers[0].x).toBe(startX);
    // Subsequent transient changes don't push again
    const s2 = editorReducer(s1, { type: "update-layer", id, patch: { x: 300 }, transient: true });
    expect(s2.history.past).toHaveLength(1);
    expect(s2.project.layers[0].x).toBe(300);
    // Commit closes the session; the next non-transient change pushes normally
    const s3 = editorReducer(s2, { type: "commit" });
    const s4 = editorReducer(s3, { type: "update-layer", id, patch: { x: 250 } });
    expect(s4.history.past.map((p) => p.layers[0].x)).toEqual([startX, 300]);
    // Undo steps back one action at a time: 250 → 300 (end of drag) → 400 (start)
    const undoneOnce = editorReducer(s4, { type: "undo" });
    expect(undoneOnce.project.layers[0].x).toBe(300);
    const undoneTwice = editorReducer(undoneOnce, { type: "undo" });
    expect(undoneTwice.project.layers[0].x).toBe(startX);
  });

  it("reset clears layers but keeps canvas size", () => {
    const s0 = stateWithLayers([makeImageLayer("d", "a.png", 100, 100, 800, 600)]);
    const s1 = editorReducer(s0, { type: "reset" });
    expect(s1.project.layers).toHaveLength(0);
    expect(s1.project.canvas.width).toBe(800);
  });

  it("caps history at HISTORY_LIMIT", () => {
    let s = initialEditorState();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      s = editorReducer(s, { type: "set-canvas", patch: { width: 100 + i } });
    }
    expect(s.history.past.length).toBeLessThanOrEqual(HISTORY_LIMIT);
  });
});

describe("editorReducer — crop-canvas (atomic crop)", () => {
  const base = () => makeImageLayer("doc-1", "photo.png", 800, 600, 800, 600);
  const overlay = () => ({
    ...makeTextLayer(800, 600),
    id: "text-overlay",
    x: 400,
    y: 300,
  });

  it("crops the target layer, resizes the canvas, single history entry", () => {
    const image = base();
    const s0 = stateWithLayers([image]);
    const next = editorReducer(s0, {
      type: "crop-canvas",
      layerId: image.id,
      crop: { x: 100, y: 75, width: 400, height: 300 },
      canvasWidth: 400,
      canvasHeight: 300,
      originX: 100,
      originY: 75,
    });
    // Canvas resized to the crop
    expect(next.project.canvas.width).toBe(400);
    expect(next.project.canvas.height).toBe(300);
    // Target layer: source crop + canvas-filling box, centered
    const target = next.project.layers[0] as ImageLayer;
    expect(target.crop).toEqual({ x: 100, y: 75, width: 400, height: 300 });
    expect(target.width).toBe(400);
    expect(target.height).toBe(300);
    expect(target.x).toBe(200);
    expect(target.y).toBe(150);
    // Atomic: exactly one history entry
    expect(next.history.past).toHaveLength(1);
    expect(next.history.past[0].canvas.width).toBe(800);
  });

  it("shifts other layers by the crop origin (keeps relative position)", () => {
    const image = base();
    const text = overlay();
    const s0 = stateWithLayers([image, text]);
    const next = editorReducer(s0, {
      type: "crop-canvas",
      layerId: image.id,
      crop: { x: 100, y: 75, width: 400, height: 300 },
      canvasWidth: 400,
      canvasHeight: 300,
      originX: 100,
      originY: 75,
    });
    const shifted = next.project.layers.find((l) => l.id === "text-overlay")!;
    // 400 - 100 = 300, 300 - 75 = 225
    expect(shifted.x).toBe(300);
    expect(shifted.y).toBe(225);
  });

  it("undo restores the pre-crop canvas and layer", () => {
    const image = base();
    const s0 = stateWithLayers([image]);
    const cropped = editorReducer(s0, {
      type: "crop-canvas",
      layerId: image.id,
      crop: { x: 0, y: 0, width: 400, height: 300 },
      canvasWidth: 400,
      canvasHeight: 300,
      originX: 0,
      originY: 0,
    });
    const undone = editorReducer(cropped, { type: "undo" });
    expect(undone.project.canvas.width).toBe(800);
    expect((undone.project.layers[0] as ImageLayer).crop).toBeNull();
  });
});

describe("editorReducer — swap-collage-slots", () => {
  const collageState = (docIds: (string | null)[]) => ({
    templateId: "grid-2" as CollageTemplateId,
    spacing: 0,
    padding: 0,
    background: "#fff",
    cellRadius: 0,
    slots: docIds.map((docId) => ({ docId, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 })),
  });

  it("swaps two slots", () => {
    const s = { ...initialEditorState(), collage: collageState(["a", "b"]) };
    const next = editorReducer(s, { type: "swap-collage-slots", a: 1, b: 0 });
    expect(next.collage?.slots.map((slot) => slot.docId)).toEqual(["b", "a"]);
  });

  it("no-ops for invalid indices and identical slots", () => {
    const s = { ...initialEditorState(), collage: collageState(["a", "b"]) };
    expect(editorReducer(s, { type: "swap-collage-slots", a: 0, b: 5 })).toBe(s);
    expect(editorReducer(s, { type: "swap-collage-slots", a: -1, b: 0 })).toBe(s);
    expect(editorReducer(s, { type: "swap-collage-slots", a: 1, b: 1 })).toBe(s);
  });

  it("no-ops without collage state", () => {
    const s = initialEditorState();
    expect(editorReducer(s, { type: "swap-collage-slots", a: 0, b: 1 })).toBe(s);
  });
});

describe("editorReducer — layers", () => {
  it("update-layer-adjustments only touches image layers", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, 800, 600);
    const text = makeTextLayer(800, 600);
    const s = stateWithLayers([image, text]);
    const next = editorReducer(s, {
      type: "update-layer-adjustments",
      id: text.id,
      patch: { brightness: 50 },
    });
    expect(next).toBe(s); // no-op for text layer
  });

  it("duplicate-layer creates a copy with new id, offset, and selection", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, 800, 600);
    const s = stateWithLayers([image]);
    const next = editorReducer(s, { type: "duplicate-layer", id: image.id });
    expect(next.project.layers).toHaveLength(2);
    const copy = next.project.layers[1];
    expect(copy.id).not.toBe(image.id);
    expect(copy.x).toBe(image.x + 24);
    expect(next.selectedLayerId).toBe(copy.id);
  });

  it("remove-layer clears selection when removing the selected layer", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, 800, 600);
    const s0 = stateWithLayers([image]);
    const s1 = editorReducer(s0, { type: "select-layer", id: image.id });
    const s2 = editorReducer(s1, { type: "remove-layer", id: image.id });
    expect(s2.selectedLayerId).toBeNull();
  });

  it("set-filter updates filter and amount", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, 800, 600);
    const s = stateWithLayers([image]);
    const next = editorReducer(s, { type: "set-filter", id: image.id, filter: "warm", amount: 0.5 });
    const layer = next.project.layers[0] as ImageLayer;
    expect(layer.filter).toBe("warm");
    expect(layer.filterAmount).toBe(0.5);
  });
});

describe("editorReducer — collage", () => {
  it("set-collage-template resizes slot array", () => {
    const slots: CollageSlotState[] = [{ docId: null, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 }, { docId: null, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 }];
    const s = { ...initialEditorState(), collage: { templateId: "grid-2" as CollageTemplateId, spacing: 0, padding: 0, background: "#fff", cellRadius: 0, slots } };
    const next = editorReducer(s, { type: "set-collage-template", id: "grid-9" });
    expect(next.collage?.slots).toHaveLength(9);
    expect(next.collage?.templateId).toBe("grid-9");
  });

  it("set-collage-slot patches the right slot", () => {
    const s = { ...initialEditorState(), collage: { templateId: "grid-2" as CollageTemplateId, spacing: 0, padding: 0, background: "#fff", cellRadius: 0, slots: [{ docId: "a", zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 }, { docId: null, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 }] } };
    const next = editorReducer(s, { type: "set-collage-slot", index: 1, patch: { docId: "b" } });
    expect(next.collage?.slots[1].docId).toBe("b");
    expect(next.collage?.slots[0].docId).toBe("a");
  });
});

describe("factories", () => {
  it("makeImageLayer fits into 90% of the canvas", () => {
    const layer = makeImageLayer("d", "big.png", 1600, 1200, 800, 600);
    expect(layer.width).toBeLessThanOrEqual(720);
    expect(layer.height).toBeLessThanOrEqual(540);
  });

  it("makeShapeLayer centers shapes with fill color", () => {
    const shape = makeShapeLayer("rect", 800, 600);
    expect(shape.x).toBe(400);
    expect(shape.fill).toBeTruthy();
  });

  it("makeTextLayer creates centered text with a sensible box", () => {
    const t = makeTextLayer(800, 600);
    expect(t.type).toBe("text");
    expect(t.x).toBe(400);
    expect(t.boxWidth).toBeGreaterThan(0);
  });
});
