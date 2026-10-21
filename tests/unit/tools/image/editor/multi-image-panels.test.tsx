import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MergePanel, CollagePanel, SplitPanel } from "@/tools/image/editor/multi-image-panels";
import {
  initialEditorState,
  type EditorState,
  type EditorAction,
} from "@/tools/image/editor/state";
import type { MergeOptions, SplitOptions } from "@/tools/image/types/editor";

const mergeOptions: MergeOptions = {
  layout: "vertical",
  spacing: 16,
  padding: 16,
  background: "#ffffff",
  align: "center",
  columns: 2,
  cellRadius: 0,
};

function renderMerge(opts: Partial<Parameters<typeof MergePanel>[0]> = {}) {
  const onOrderChange = vi.fn();
  const onMerge = vi.fn();
  const onOpenInEditor = vi.fn();
  render(
    <TooltipProvider>
      <MergePanel
        docs={[
          { id: "d1", name: "a.png", width: 100, height: 100 },
          { id: "d2", name: "b.png", width: 100, height: 100 },
          { id: "d3", name: "c.png", width: 100, height: 100 },
        ]}
        order={null}
        onOrderChange={onOrderChange}
        options={mergeOptions}
        onOptionsChange={() => {}}
        onMerge={onMerge}
        onOpenInEditor={onOpenInEditor}
        busy={false}
        {...opts}
      />
    </TooltipProvider>,
  );
  return { onOrderChange, onMerge, onOpenInEditor };
}

describe("MergePanel — order controls", () => {
  it("lists docs in import order by default with position numbers", () => {
    renderMerge();
    expect(screen.getByText("a.png")).toBeTruthy();
    expect(screen.getByText("b.png")).toBeTruthy();
    expect(screen.getByText("c.png")).toBeTruthy();
    // Move-up disabled for the first, move-down disabled for the last
    expect(
      screen.getByRole("button", { name: "Move a.png earlier" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Move c.png later" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("moving an image later reports the new order", () => {
    const { onOrderChange } = renderMerge();
    fireEvent.click(screen.getByRole("button", { name: "Move a.png later" }));
    expect(onOrderChange).toHaveBeenCalledWith(["d2", "d1", "d3"]);
  });

  it("moving an image earlier reports the new order", () => {
    const { onOrderChange } = renderMerge();
    fireEvent.click(screen.getByRole("button", { name: "Move c.png earlier" }));
    expect(onOrderChange).toHaveBeenCalledWith(["d1", "d3", "d2"]);
  });

  it("applies a custom order (custom order first, new imports appended)", () => {
    renderMerge({
      docs: [
        { id: "d1", name: "a.png", width: 100, height: 100 },
        { id: "d2", name: "b.png", width: 100, height: 100 },
        { id: "d3", name: "new.png", width: 100, height: 100 },
      ],
      order: ["d3", "d2"],
    });
    // Custom order d3 (new.png) first, d2 (b.png) second; d1 (a.png, not in
    // the custom order) appended last.
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("new.png");
    expect(items[1].textContent).toContain("b.png");
    expect(items[2].textContent).toContain("a.png");
  });

  it("offers reset to import order when a custom order exists", () => {
    const { onOrderChange } = renderMerge({ order: ["d2", "d1", "d3"] });
    fireEvent.click(screen.getByRole("button", { name: /reset to import order/i }));
    expect(onOrderChange).toHaveBeenCalledWith(null);
  });

  it("fires merge and open-in-editor actions", () => {
    const { onMerge, onOpenInEditor } = renderMerge();
    fireEvent.click(screen.getByTestId("merge-images"));
    expect(onMerge).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTestId("merge-open-editor"));
    expect(onOpenInEditor).toHaveBeenCalledOnce();
  });

  it("shows an import hint with fewer than two images", () => {
    render(
      <TooltipProvider>
        <MergePanel
          docs={[{ id: "d1", name: "a.png", width: 10, height: 10 }]}
          order={null}
          onOrderChange={() => {}}
          options={mergeOptions}
          onOptionsChange={() => {}}
          onMerge={() => {}}
          onOpenInEditor={() => {}}
          busy={false}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText(/import at least two images/i)).toBeTruthy();
  });
});

/* ── CollagePanel swap ───────────────────────────────────── */

function collageState(): EditorState {
  const base = initialEditorState();
  return {
    ...base,
    collage: {
      templateId: "grid-2",
      spacing: 0,
      padding: 0,
      background: "#ffffff",
      cellRadius: 0,
      slots: [
        { docId: "d1", zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 },
        { docId: "d2", zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 },
      ],
    },
  };
}

function renderCollage() {
  const dispatch = vi.fn((a: EditorAction) => a);
  render(
    <TooltipProvider>
      <CollagePanel
        state={collageState()}
        dispatch={dispatch}
        docs={[
          { id: "d1", name: "a.png" },
          { id: "d2", name: "b.png" },
        ]}
        onExportCollage={() => {}}
        busy={false}
        onAddDocToSlot={() => {}}
        selectedSlot={null}
        onSelectSlot={() => {}}
      />
    </TooltipProvider>,
  );
  return dispatch;
}

describe("CollagePanel — slot swap", () => {
  it("offers swap-with-previous on every slot except the first", () => {
    renderCollage();
    expect(screen.queryByRole("button", { name: /swap slot 1/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Swap slot 2 with slot 1" })).toBeTruthy();
  });

  it("swap dispatches swap-collage-slots with adjacent indices", () => {
    const dispatch = renderCollage();
    fireEvent.click(screen.getByRole("button", { name: "Swap slot 2 with slot 1" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "swap-collage-slots",
      a: 1,
      b: 0,
    });
  });
});

describe("SplitPanel — custom guides UI", () => {
  const baseOptions: SplitOptions = {
    mode: "grid",
    rows: 2,
    columns: 2,
    evenly: false,
    guideX: [200],
    guideY: [100],
  };

  function renderSplit(options: SplitOptions) {
    const onOptionsChange = vi.fn();
    render(
      <TooltipProvider>
        <SplitPanel
          options={options}
          onOptionsChange={onOptionsChange}
          onExportSplit={() => {}}
          busy={false}
          canvasWidth={400}
          canvasHeight={300}
        />
      </TooltipProvider>,
    );
    return onOptionsChange;
  }

  it("shows guide positions and add-cut buttons when uneven", () => {
    renderSplit(baseOptions);
    expect(screen.getByTestId("split-guides")).toBeTruthy();
    expect(screen.getByText(/vertical cut 1: 200px/i)).toBeTruthy();
    expect(screen.getByText(/horizontal cut 1: 100px/i)).toBeTruthy();
    expect(screen.getByTestId("add-guide-x")).toBeTruthy();
    expect(screen.getByTestId("add-guide-y")).toBeTruthy();
    // 2 cuts → (1+1)×(1+1) = 4 files
    expect(screen.getByTestId("export-split").textContent).toContain("4 files");
  });

  it("adds a cut in the widest gap (never collides with existing cuts)", () => {
    const onOptionsChange = renderSplit(baseOptions);
    fireEvent.click(screen.getByTestId("add-guide-x"));
    // Existing cut at 200 on a 400 canvas: gaps 0–200 and 200–400 tie, the
    // first wins → new cut at 100 (not at 200, which would merge away).
    expect(onOptionsChange).toHaveBeenCalledWith({ guideX: [200, 100] });
  });

  it("removes a cut", () => {
    const onOptionsChange = renderSplit(baseOptions);
    fireEvent.click(screen.getByRole("button", { name: /remove vertical cut 1/i }));
    expect(onOptionsChange).toHaveBeenCalledWith({ guideX: [] });
  });

  it("turning the even switch on clears guides; off seeds midpoints", () => {
    const onOptionsChange = renderSplit({ ...baseOptions, evenly: true });
    const sw = screen.getByRole("switch", { name: /even regions/i });
    // Radix switch: click the button element
    fireEvent.click(sw);
    const call = onOptionsChange.mock.calls.at(-1)?.[0] as Partial<SplitOptions>;
    expect(call.evenly).toBe(false);
    expect(call.guideX).toEqual([200]);
    expect(call.guideY).toEqual([150]);
  });
});
