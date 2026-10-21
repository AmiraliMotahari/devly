import { expect, test } from "@playwright/test";
import { fixture, navigateToTool, trackPageErrors } from "./helpers";

/**
 * Advanced Image Editor — critical workflows.
 *
 * Uses the tiny deterministic pixel fixtures (pixel.png 1x1 is too small
 * for meaningful canvas math, so pixel.jpg/png are checked for load;
 * larger interactions assert on editor UI state rather than pixels).
 */

/**
 * Upload into the editor and wait for the editor main view. Unlike the
 * shared uploadFile helper (which waits for a unique filename row), the
 * editor shows filenames in several places (staged rows, layer names),
 * so we wait for the editor state transition instead.
 */
async function uploadToEditor(page: import("@playwright/test").Page, filePaths: string[]) {
  // The editor mounts via next/dynamic: wait for its import state to
  // appear (client-side render complete), then upload.
  const importState = page.getByTestId("editor-import-state").or(page.getByRole("button", { name: "Import images" }));
  await expect(importState.first()).toBeVisible({ timeout: 20_000 });
  const input = page.locator('input[type="file"]').first();
  // Hydration guard: if the fill lands pre-hydration the change event is
  // lost. Retry once — clearing the input first, because selecting the same
  // file again would not fire another change event.
  for (let attempt = 0; attempt < 2; attempt++) {
    await input.setInputFiles(filePaths);
    try {
      await expect(page.getByTestId("editor-main")).toBeVisible({ timeout: 8_000 });
      return;
    } catch {
      if (attempt === 1) throw new Error("Upload did not open the editor (hydration race)");
      await input
        .evaluate((el: HTMLInputElement) => {
          el.value = "";
        })
        .catch(() => {});
    }
  }
}

test.describe("Advanced Image Editor", () => {
  test("imports an image and renders the editor shell", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");

    // Import state visible before any image
    await expect(page.getByTestId("editor-import-state")).toBeVisible();

    await uploadToEditor(page, [fixture("pixel.png")]);

    // Editor main view replaces the import state
    await expect(page.getByTestId("editor-main")).toBeVisible();
    await expect(page.getByTestId("editor-canvas")).toBeVisible();
    await expect(page.getByTestId("editor-toolbar")).toBeVisible();
    await expect(page.getByTestId("layers-panel")).toBeVisible();

    // Canvas shows the imported image dimensions
    await expect(page.getByTestId("editor-canvas-size")).toContainText("1 × 1");

    await errors.assertNone("advanced-image-editor import");
  });

  test("selection frame is centered on the layer it outlines", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("wide.png")]);

    // The base layer is centered on the canvas, so its selection frame
    // must be too (x/y are the layer CENTER — a frame placed by its
    // top-left lands half a layer off).
    const frame = page.getByTestId("layer-selection");
    await expect(frame).toBeVisible();
    const [frameBox, canvasBox] = await Promise.all([
      frame.boundingBox(),
      page.locator("[data-testid='editor-canvas'] canvas").boundingBox(),
    ]);
    if (!frameBox || !canvasBox) throw new Error("missing box");
    const frameCenterX = frameBox.x + frameBox.width / 2;
    const frameCenterY = frameBox.y + frameBox.height / 2;
    const canvasCenterX = canvasBox.x + canvasBox.width / 2;
    const canvasCenterY = canvasBox.y + canvasBox.height / 2;
    expect(Math.abs(frameCenterX - canvasCenterX)).toBeLessThan(2);
    expect(Math.abs(frameCenterY - canvasCenterY)).toBeLessThan(2);
    await errors.assertNone("advanced-image-editor selection frame");
  });

  test("adjustments update the image and reset works", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    // Enter adjust mode via toolbar
    await page.getByRole("button", { name: "Adjust" }).click();
    await expect(page.getByTestId("properties-panel")).toBeVisible();

    // Brightness slider exists and is adjustable via keyboard
    const brightness = page.getByTestId("slider-brightness");
    await expect(brightness).toBeVisible();
    await brightness.focus();
    await page.keyboard.press("ArrowRight");

    // History recorded the change — undo is enabled
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();

    // Reset adjustments returns to neutral
    await page.getByRole("button", { name: "Reset adjustments" }).click();
    await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
    await errors.assertNone("advanced-image-editor adjust");
  });

  test("add and edit a text layer", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    await page.getByRole("button", { name: "Text" }).click();
    await page.getByTestId("add-text").click();

    // Text layer appears in the layers list and gets selected
    await expect(page.getByTestId("layers-panel")).toContainText("Text");

    // Content field is editable
    const content = page.getByLabel("Text content");
    await content.fill("Devly test");

    // Font size slider reacts
    const size = page.getByTestId("slider-font-size");
    await expect(size).toBeVisible();

    await errors.assertNone("advanced-image-editor text");
  });

  test("canvas border and rounded corners apply", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    await page.getByRole("button", { name: "Canvas" }).click();
    // Border section (aria-label on <section>) and its Style select
    await expect(page.getByLabel("Border", { exact: true })).toBeVisible();
    await page.locator("#border-style").click();
    await page.getByRole("option", { name: "Solid" }).click();

    // Border width slider becomes available
    await expect(page.getByTestId("slider-border-width")).toBeVisible();

    // Corner radius slider reacts to keyboard
    const radius = page.getByTestId("slider-corner-radius");
    await expect(radius).toBeVisible();
    await radius.focus();
    await page.keyboard.press("ArrowRight");
    await errors.assertNone("advanced-image-editor border");
  });

  test("undo and redo track edits", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    // Add a text layer (one history entry)
    await page.getByRole("button", { name: "Text" }).click();
    await page.getByTestId("add-text").click();
    const undo = page.getByRole("button", { name: "Undo" });
    const redo = page.getByRole("button", { name: "Redo" });
    await expect(undo).toBeEnabled();
    await expect(redo).toBeDisabled();

    // Undo removes the layer; redo restores it
    await undo.click();
    await expect(page.getByTestId("layers-panel")).not.toContainText("Text");
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(page.getByTestId("layers-panel")).toContainText("Text");

    // Keyboard shortcut: Ctrl/Cmd+Z undoes
    await page.keyboard.press(process.platform === "darwin" ? "Meta+Z" : "Control+Z");
    await expect(page.getByTestId("layers-panel")).not.toContainText("Text");
    await errors.assertNone("advanced-image-editor undo/redo");
  });

  test("export dialog renders preview and downloads a PNG", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    await page.getByTestId("open-export").click();
    const dialog = page.getByTestId("export-dialog");
    await expect(dialog).toBeVisible();

    // Render the preview
    await page.getByTestId("confirm-export").click();
    await expect(page.getByRole("img", { name: /preview of/i })).toBeVisible({
      timeout: 15_000,
    });

    // Download produces a real PNG
    const download = page.waitForEvent("download", { timeout: 30_000 });
    await page.getByTestId("download-export").click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/\.png$/i);
    const path = await dl.path();
    if (path) {
      const { readFileSync } = await import("node:fs");
      const buf = readFileSync(path);
      expect(buf[0]).toBe(0x89);
      expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
    }
    await errors.assertNone("advanced-image-editor export");
  });

  test("import multiple images enables merge workflow", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    // Add a second image through the import sheet
    await page.getByRole("button", { name: "Import images" }).click();
    const input = page.locator('input[type="file"]').last();
    await input.setInputFiles(fixture("pixel.jpg"));

    // Both images are listed as layers
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.png");
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.jpg");

    // Merge mode is available and runs
    await page.getByRole("button", { name: "Merge" }).click();
    await expect(page.getByText(/merge images/i).first()).toBeVisible();
    await page.getByTestId("merge-images").click();

    // Export dialog opens with the merged preview
    await expect(page.getByTestId("export-dialog")).toBeVisible({ timeout: 15_000 });
    await errors.assertNone("advanced-image-editor merge");
  });

  test("split mode exports multiple files", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    await page.getByRole("button", { name: "Split" }).click();
    await expect(page.getByText(/split image/i).first()).toBeVisible();

    // Default: 2×2 grid = 4 files
    await expect(page.getByTestId("export-split")).toContainText("4 files");

    // Columns mode: count = columns (default 2)
    await page.getByRole("button", { name: "Columns", exact: true }).click();
    await expect(page.getByTestId("export-split")).toContainText("2 files");

    // Rows mode: count = rows (default 2)
    await page.getByRole("button", { name: "Rows", exact: true }).click();
    await expect(page.getByTestId("export-split")).toContainText("2 files");

    await page.getByTestId("export-split").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("export-dialog")).toContainText("2 files ready");
    await errors.assertNone("advanced-image-editor split");
  });

  test("collage mode with template selection", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");

    // Import two images for the collage
    await uploadToEditor(page, [fixture("pixel.png")]);
    await page.getByRole("button", { name: "Import images" }).click();
    await page.locator('input[type="file"]').last().setInputFiles(fixture("pixel.jpg"));

    // Wait for both images to register as layers before entering collage
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.png");
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.jpg");

    await page.getByRole("button", { name: "Collage" }).click();
    await expect(page.getByRole("region", { name: "Collage template" })).toBeVisible();

    // Slots are listed; first slot auto-fills from imports
    await expect(page.getByRole("button", { name: /^Slot 1/ })).toBeVisible();
    await expect(page.getByText(/pixel\.png|empty/).first()).toBeVisible();

    // Switching templates adjusts slot count
    await page.getByRole("button", { name: /9 · grid/i }).click();
    await expect(page.getByText("Slot 9")).toBeVisible();

    // Export renders the collage
    await page.getByTestId("export-collage").click();
    await expect(page.getByTestId("export-dialog")).toBeVisible({ timeout: 20_000 });
    await errors.assertNone("advanced-image-editor collage");
  });

  test("background removal runs and reports success or failure gracefully", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    await page.getByRole("button", { name: "Remove BG" }).click();
    const removeBtn = page.getByTestId("remove-background");
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Completes with a success toast — the editor must never crash or hang.
    const toast = page.getByText("Background removed");
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("editor-main")).toBeVisible();
    await errors.assertNone("advanced-image-editor bg-removal");
  });

  test("rejects non-image files with a clear error", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(fixture("sample.txt"));

    // Stays on the import state; the invalid file is flagged
    await expect(page.locator("text=sample.txt").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/unsupported|invalid/i).first()).toBeVisible();
    await expect(page.getByTestId("editor-import-state")).toBeVisible();
    await errors.assertNone("advanced-image-editor invalid file");
  });

  test("pixel assertions: filter changes pixels, corner radius clips alpha @critical", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("solid.png")]);

    /**
     * Read a pixel from the editor canvas as [r,g,b,a] via getImageData.
     * Retries until the canvas has a painted frame (the preview renders
     * in a rAF tick after the editor mounts — webkit can lag one frame).
     */
    const readPixel = (x: number, y: number, opts?: { waitForPaint?: boolean }) =>
      page.evaluate(
        ([px, py, waitPaint]) => {
          const cnv = document.querySelector<HTMLCanvasElement>(
            "[data-testid='editor-canvas'] canvas",
          );
          if (!cnv) throw new Error("canvas not found");
          const read = () => {
            // Canvas-space coords: map proportionally (canvas is scaled to fit).
            const sx = (px / 40) * cnv.width;
            const sy = (py / 40) * cnv.height;
            const d = cnv
              .getContext("2d")!
              .getImageData(Math.round(sx), Math.round(sy), 1, 1).data;
            return [d[0], d[1], d[2], d[3]];
          };
          if (!waitPaint) return read();
          // Sample the CENTER: once any opaque pixel exists the frame is in.
          const probe = cnv
            .getContext("2d")!
            .getImageData(
              Math.round(cnv.width / 2),
              Math.round(cnv.height / 2),
              1,
              1,
            ).data;
          return probe[3] !== 0 ? read() : null;
        },
        [x, y, !!opts?.waitForPaint] as [number, number, boolean],
      );

    /** Poll a pixel read until the canvas is painted (max ~5s). */
    const readPixelPainted = async (x: number, y: number) => {
      for (let i = 0; i < 50; i++) {
        const out = await readPixel(x, y, { waitForPaint: true });
        if (out) return out as number[];
        await page.waitForTimeout(100);
      }
      throw new Error("canvas never painted within 5s");
    };

    // Baseline: center is the fixture's red (200,40,40), opaque.
    const base = await readPixelPainted(20, 20);
    expect(base[3]).toBe(255);
    expect(base[0]).toBeGreaterThan(150);
    expect(base[1]).toBeLessThan(80);

    // Apply the Warm filter (temperature +35 → R up, B down vs baseline).
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByTestId("filter-warm").click();
    const warmed = await readPixelPainted(20, 20);
    expect(warmed[3]).toBe(255);
    expect(warmed[0]).toBeGreaterThan(base[0]); // warmed red channel
    expect(warmed[2]).toBeLessThan(base[2]); // cooled blue channel

    // Remove filter; add corner radius: corner pixel becomes transparent.
    await page.getByTestId("filter-warm").click(); // toggle off via None
    await page.getByRole("button", { name: "None" }).click();
    await page.getByRole("button", { name: "Canvas" }).click();
    const radius = page.getByTestId("slider-corner-radius");
    // Drag radius to max (40px canvas → up to 20 = fully round corners).
    await radius.focus();
    for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
    const corner = await readPixelPainted(1, 1);
    expect(corner[3]).toBe(0); // clipped by corner radius
    const center = await readPixelPainted(20, 20);
    expect(center[3]).toBe(255); // center unaffected
    await errors.assertNone("advanced-image-editor pixel asserts");
  });

  test("pixel assertion: solid border color renders at the canvas edge", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("solid.png")]);

    await page.getByRole("button", { name: "Canvas" }).click();
    await page.locator("#border-style").click();
    await page.getByRole("option", { name: "Solid" }).click();
    // Selecting Solid defaults the width to 4 canvas px.
    await expect(page.getByTestId("slider-border-width")).toBeVisible();
    const edge = await page.evaluate(() => {
      const cnv = document.querySelector<HTMLCanvasElement>("[data-testid='editor-canvas'] canvas");
      if (!cnv) throw new Error("canvas not found");
      const d = cnv.getContext("2d")!.getImageData(0, Math.round(cnv.height / 2), 1, 1).data;
      return [d[0], d[1], d[2], d[3]];
    });
    // White border over red image: outermost pixel should be white.
    expect(edge[3]).toBe(255);
    expect(edge[0]).toBeGreaterThan(200);
    expect(edge[1]).toBeGreaterThan(200);
    expect(edge[2]).toBeGreaterThan(200);
    await errors.assertNone("advanced-image-editor border pixels");
  });

  test("split mode shows region overlay; custom guides update the count", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("wide.png")]);

    // Split mode: 2×2 grid → overlay draws 4 dashed region outlines.
    await page.getByRole("button", { name: "Split" }).click();
    await expect(page.getByTestId("export-split")).toContainText("4 files");

    // Turn off even regions → custom guides UI with seeded midpoints.
    await page.getByRole("switch", { name: /even regions/i }).click();
    const guides = page.getByTestId("split-guides");
    await expect(guides).toBeVisible();
    // One cut per axis → 2×2 = 4 regions
    await expect(page.getByTestId("export-split")).toContainText("4 files");

    // Add another vertical cut → 3×2 = 6 files
    await page.getByTestId("add-guide-x").click();
    await expect(page.getByTestId("export-split")).toContainText("6 files");

    // Remove the horizontal cut → 3×1 = 3 files
    await page.getByRole("button", { name: /remove horizontal cut 1/i }).click();
    await expect(page.getByTestId("export-split")).toContainText("3 files");

    // Guide lines are draggable handles on the canvas.
    await expect(
      page.getByRole("slider", { name: /vertical cut 1 at/i }).first(),
    ).toBeVisible();
    await errors.assertNone("advanced-image-editor split guides");
  });

  test("crop aspect locks the drag region shape", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("wide.png")]);

    await page.getByRole("button", { name: "Crop" }).click();
    await page.locator("#crop-aspect").click();
    await page.getByRole("option", { name: "1:1 Square" }).click();

    // Drag a wide region on the canvas — the aspect lock reshapes it.
    // Drag at a point visible in the viewport (the wrap box can extend
    // beyond it for large canvases).
    const canvas = page.getByTestId("editor-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas box missing");
    const vp = page.viewportSize() ?? { width: 1280, height: 720 };
    const startX = box.x + Math.min(box.width / 2, vp.width - box.x - 20);
    const startY = box.y + Math.min(box.height / 2, vp.height - box.y - 20);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + Math.min(80, box.width * 0.4), startY + 6, {
      steps: 6,
    });
    await page.mouse.up();

    // The overlay reports a square region (equal width/height).
    const dims = await page.getByTestId("crop-overlay").locator("p").textContent();
    const [w, h] = (dims ?? "").split("×").map((n) => Number(n.trim()));
    expect(Math.abs(w - h)).toBeLessThanOrEqual(1);

    // Apply the crop: canvas size label shrinks to the region.
    await page.getByTestId("apply-crop").click();
    await expect(page.getByTestId("editor-canvas-size")).not.toContainText("40 × 40");
    await errors.assertNone("advanced-image-editor crop aspect");
  });

  test("re-importing the same file through the import sheet does not duplicate layers", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.png");

    // Re-drop the SAME file via the import sheet — dedupe keeps one layer.
    await page.getByRole("button", { name: "Import images" }).click();
    const input = page.locator('input[type="file"]').last();
    await input.setInputFiles(fixture("pixel.png"));

    // The sheet closes on successful import; when dedupe kicks in the
    // layer count stays 1. Wait for the import round-trip to settle.
    await page.waitForTimeout(600);
    const rows = await page
      .getByTestId("layers-panel")
      .locator("li", { hasText: "pixel.png" })
      .count();
    expect(rows).toBe(1);
    await errors.assertNone("advanced-image-editor re-import dedupe");
  });

  test("pan: space+drag scrolls the zoomed canvas", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("wide.png")]);

    // Zoom in via the header so the canvas overflows the viewport.
    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    for (let i = 0; i < 4; i++) await zoomIn.click();

    const wrap = page.getByTestId("editor-canvas");
    const before = await wrap.evaluate((el) => ({
      left: el.scrollLeft,
      top: el.scrollTop,
    }));

    // Space+drag pans. Blur the zoom button first (space-pan ignores
    // keydowns from buttons), and drag at a point VISIBLE in the viewport —
    // the wrap's bounding box extends beyond it when zoomed.
    await zoomIn.blur();
    await page.keyboard.down("Space");
    const wrapBox = await wrap.boundingBox();
    if (!wrapBox) throw new Error("canvas box missing");
    const vp = page.viewportSize() ?? { width: 1280, height: 720 };
    const px = Math.max(10, Math.min(wrapBox.x + wrapBox.width / 2, vp.width - 10));
    const py = Math.max(10, Math.min(wrapBox.y + wrapBox.height / 2, vp.height - 10));
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(px - 60, py - 40, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up("Space");

    const after = await wrap.evaluate((el) => ({
      left: el.scrollLeft,
      top: el.scrollTop,
    }));
    // Panning moved the scroll position (at least one axis).
    expect(
      Math.abs(after.left - before.left) + Math.abs(after.top - before.top),
    ).toBeGreaterThan(0);
    await errors.assertNone("advanced-image-editor pan smoke");
  });

  test("text-only design: start from the empty state without images", async ({ page }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");

    // Text and Elements are reachable without importing an image.
    await page.getByTestId("start-text-design").click();
    await expect(page.getByTestId("editor-main")).toBeVisible();
    await expect(page.getByTestId("editor-canvas")).toBeVisible();

    // A text layer exists and is selected for editing.
    await expect(page.getByTestId("layers-panel")).toContainText("Text");
    const content = page.getByLabel("Text content");
    await expect(content).toBeVisible();

    // Elements mode is also available (shape button adds a layer).
    await page.getByRole("button", { name: "Elements" }).click();
    await page.getByRole("button", { name: "Rectangle" }).click();
    // Shape layers are named after their kind ("Rect", "Ellipse", ...).
    await expect(page.getByTestId("layers-panel")).toContainText("Rect");

    // Export works with zero image layers.
    await page.getByTestId("open-export").click();
    await page.getByTestId("confirm-export").click();
    await expect(page.getByRole("img", { name: /preview of/i })).toBeVisible({
      timeout: 15_000,
    });
    await errors.assertNone("advanced-image-editor text-only design");
  });

  test("merge order controls reorder images and open-in-editor loads the layout", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await navigateToTool(page, "advanced-image-editor");
    await uploadToEditor(page, [fixture("pixel.png")]);

    // Add a second image for a mergeable set.
    await page.getByRole("button", { name: "Import images" }).click();
    await page.locator('input[type="file"]').last().setInputFiles(fixture("pixel.jpg"));
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.jpg");

    await page.getByRole("button", { name: "Merge" }).click();
    // Order list shows both docs with move controls.
    await expect(page.getByRole("button", { name: /move pixel\.png earlier/i })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /move pixel\.png later/i }),
    ).toBeEnabled();

    // Open the merge layout in the editor: canvas becomes the merged size
    // and both images remain as editable layers.
    await page.getByTestId("merge-open-editor").click();
    await expect(page.getByText(/merged layout opened/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.png");
    await expect(page.getByTestId("layers-panel")).toContainText("pixel.jpg");
    await errors.assertNone("advanced-image-editor merge open-in-editor");
  });
});
