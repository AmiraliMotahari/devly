import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorToolbar } from "@/tools/image/editor/editor-toolbar";
import { LayersPanel } from "@/tools/image/editor/layers-panel";
import { PropertiesPanel } from "@/tools/image/editor/properties-panel";
import {
  initialEditorState,
  makeImageLayer,
  makeTextLayer,
  type EditorState,
  type EditorAction,
} from "@/tools/image/editor/state";
import type { EditorLayer } from "@/tools/image/types/editor";
import { COLLAGE_TEMPLATES, DEFAULT_CANVAS } from "@/tools/image/types/editor";

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const CANVAS = { ...DEFAULT_CANVAS, width: 800, height: 600 };

function stateWithLayers(layers: EditorLayer[], mode: EditorState["mode"] = "select") {
  return {
    ...initialEditorState({ canvas: CANVAS, layers }),
    mode,
    selectedLayerId: layers[0]?.id ?? null,
  };
}

function dispatchSpy() {
  const dispatch = vi.fn((a: EditorAction) => a);
  return dispatch;
}

describe("EditorToolbar", () => {
  const noop = () => {};

  it("renders all mode buttons with accessible names", () => {
    renderWithProviders(
      <EditorToolbar mode="select" onModeChange={noop} onImport={noop} hasImages />,
    );
    for (const label of ["Select", "Crop", "Adjust", "Filters", "Text", "Elements", "Canvas", "Remove BG", "Merge", "Split", "Collage"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("marks the active mode as pressed", () => {
    renderWithProviders(
      <EditorToolbar mode="crop" onModeChange={noop} onImport={noop} hasImages />,
    );
    expect(screen.getByRole("button", { name: "Crop" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Text" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("disables editing modes without images but keeps select/canvas", () => {
    renderWithProviders(
      <EditorToolbar mode="select" onModeChange={noop} onImport={noop} hasImages={false} />,
    );
    expect(screen.getByRole("button", { name: "Filters" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Select" })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: "Canvas" })).toHaveProperty("disabled", false);
  });

  it("fires mode changes on click", async () => {
    const onModeChange = vi.fn();
    renderWithProviders(
      <EditorToolbar mode="select" onModeChange={onModeChange} onImport={noop} hasImages />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    await waitFor(() => expect(onModeChange).toHaveBeenCalledWith("text"));
  });
});

describe("LayersPanel", () => {
  it("lists layers top-first with type icons and names", () => {
    const image = makeImageLayer("doc-1", "photo.png", 100, 100, CANVAS.width, CANVAS.height);
    const text = makeTextLayer(CANVAS.width, CANVAS.height);
    const dispatch = dispatchSpy();
    renderWithProviders(
      <LayersPanel state={stateWithLayers([image, text])} dispatch={dispatch} />,
    );
    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(screen.getByText("Text")).toBeTruthy();
  });

  it("shows an empty state without layers", () => {
    renderWithProviders(
      <LayersPanel state={stateWithLayers([])} dispatch={dispatchSpy()} />,
    );
    expect(screen.getByText(/no layers yet/i)).toBeTruthy();
  });

  it("dispatches visibility toggle and delete", () => {
    const image = makeImageLayer("doc-1", "photo.png", 100, 100, CANVAS.width, CANVAS.height);
    const dispatch = dispatchSpy();
    renderWithProviders(
      <LayersPanel state={stateWithLayers([image])} dispatch={dispatch} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /hide photo\.png/i }));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "update-layer", patch: { visible: false } }),
    );
    fireEvent.click(screen.getByRole("button", { name: /delete photo\.png/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "remove-layer" }));
  });

  it("dispatches z-order operations", () => {
    const a = makeImageLayer("d1", "a.png", 100, 100, CANVAS.width, CANVAS.height);
    const b = makeImageLayer("d2", "b.png", 100, 100, CANVAS.width, CANVAS.height);
    const dispatch = dispatchSpy();
    renderWithProviders(
      <LayersPanel state={stateWithLayers([a, b])} dispatch={dispatch} />,
    );
    for (const [label, action] of [
      ["Bring a.png forward", "forward"],
      ["Send a.png backward", "backward"],
      ["Bring a.png to front", "front"],
      ["Send a.png to back", "back"],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reorder-layer", action }),
      );
    }
  });

  it("selects a layer on row click", () => {
    const a = makeImageLayer("d1", "a.png", 100, 100, CANVAS.width, CANVAS.height);
    const dispatch = dispatchSpy();
    renderWithProviders(
      <LayersPanel state={stateWithLayers([a])} dispatch={dispatch} />,
    );
    fireEvent.click(screen.getByText("a.png"));
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "select-layer", id: a.id }),
    );
  });
});

describe("PropertiesPanel — mode panels", () => {
  it("select mode shows a hint when nothing is selected", () => {
    const state = { ...initialEditorState({ canvas: CANVAS, layers: [] }), mode: "select" as const };
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    expect(screen.getByText(/select a layer/i)).toBeTruthy();
  });

  it("adjust mode without image layer shows import hint", () => {
    const state = { ...initialEditorState({ canvas: CANVAS, layers: [] }), mode: "adjust" as const };
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    expect(screen.getByText(/import an image first/i)).toBeTruthy();
  });

  it("adjust mode renders sliders for all adjustment axes", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, CANVAS.width, CANVAS.height);
    const state = stateWithLayers([image], "adjust");
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    for (const axis of ["Brightness", "Contrast", "Saturation", "Exposure", "Temperature", "Tint", "Highlights", "Shadows", "Sharpness", "Blur", "Grayscale"]) {
      expect(screen.getByText(axis)).toBeTruthy();
    }
  });

  it("filters mode lists all presets", () => {
    const image = makeImageLayer("d", "a.png", 100, 100, CANVAS.width, CANVAS.height);
    const state = stateWithLayers([image], "filters");
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    expect(screen.getByText("None")).toBeTruthy();
    for (const preset of ["Grayscale", "Vintage", "Warm", "Cool", "High Contrast", "Fade", "Sharpen"]) {
      expect(screen.getByText(preset)).toBeTruthy();
    }
  });

  it("text mode can add a text layer", () => {
    const state = { ...initialEditorState({ canvas: CANVAS, layers: [] }), mode: "text" as const };
    const dispatch = dispatchSpy();
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatch} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    const addBtn = screen.getByTestId("add-text");
    expect(addBtn).toBeTruthy();
    fireEvent.click(addBtn);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "add-layer" }));
  });

  it("text mode with a selected text layer shows content + font controls", () => {
    const text = makeTextLayer(CANVAS.width, CANVAS.height);
    const state = stateWithLayers([text], "text");
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    expect(screen.getByLabelText("Text content")).toBeTruthy();
    expect(screen.getByText("Font family")).toBeTruthy();
    expect(screen.getByText("Alignment")).toBeTruthy();
  });

  it("elements mode lists shape buttons", () => {
    const state = { ...initialEditorState({ canvas: CANVAS, layers: [] }), mode: "elements" as const };
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    for (const shape of ["Rectangle", "Ellipse", "Triangle", "Line"]) {
      expect(screen.getByRole("button", { name: shape })).toBeTruthy();
    }
  });

  it("canvas mode shows size and border controls", () => {
    const state = { ...initialEditorState({ canvas: CANVAS }), mode: "canvas" as const };
    renderWithProviders(
      <PropertiesPanel state={state} dispatch={dispatchSpy()} onCropApply={() => {}} cropAspect="free" onCropAspectChange={() => {}} cropReady={false} straighten={0} onStraightenChange={() => {}} />,
    );
    expect(screen.getByLabelText("Width")).toBeTruthy();
    expect(screen.getByLabelText("Height")).toBeTruthy();
    expect(screen.getByText("Border")).toBeTruthy();
  });
});

describe("Collage templates integrity (used by CollagePanel)", () => {
  it("every template covers the full unit square within tolerance", () => {
    for (const t of COLLAGE_TEMPLATES) {
      const area = t.cells.reduce((sum, c) => sum + c.w * c.h, 0);
      // Overlap templates (stack) exceed 1; grids cover exactly 1.
      expect(area).toBeGreaterThanOrEqual(0.99);
      expect(t.cells.every((c) => c.x >= -0.001 && c.y >= -0.001)).toBe(true);
    }
  });
});
