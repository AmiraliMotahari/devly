import { describe, expect, it, vi } from "vitest";
import { BitmapRegistry, type ImageDoc } from "@/tools/image/processing/render";
import { makeImageLayer } from "@/tools/image/editor/state";
import type { EditorProject } from "@/tools/image/types/editor";

/** Deterministic ImageDoc stub — no real bitmaps needed for reconcile tests. */
function stubDoc(id: string): ImageDoc {
  return {
    id,
    name: `${id}.png`,
    width: 10,
    height: 10,
    type: "image/png",
    size: 10,
    get: () => ({ width: 10, height: 10 }) as ImageBitmap,
    release: () => {},
  };
}

function projectWith(docIds: string[]): EditorProject {
  return {
    canvas: {
      width: 100,
      height: 100,
      background: "#fff",
      borderRadius: 0,
      padding: 0,
      border: { style: "none", color: "#fff", width: 0 },
      aspectPreset: "original",
    },
    layers: docIds.map((docId) =>
      makeImageLayer(docId, `${docId}.png`, 100, 100, 100, 100),
    ),
  };
}

describe("BitmapRegistry.reconcile", () => {
  it("keeps docs referenced by the current project", () => {
    const registry = new BitmapRegistry();
    const doc = stubDoc("a");
    const release = vi.spyOn(doc, "release");
    registry.add(doc);
    registry.reconcile([projectWith(["a"])]);
    expect(registry.get("a")).toBe(doc);
    expect(release).not.toHaveBeenCalled();
  });

  it("keeps docs referenced by undo/redo history (past + future)", () => {
    const registry = new BitmapRegistry();
    const current = stubDoc("current");
    const past = stubDoc("past");
    const future = stubDoc("future");
    const orphan = stubDoc("orphan");
    const releases = [
      vi.spyOn(current, "release"),
      vi.spyOn(past, "release"),
      vi.spyOn(future, "release"),
      vi.spyOn(orphan, "release"),
    ];
    [current, past, future, orphan].forEach((d) => registry.add(d));
    registry.reconcile([
      projectWith(["current"]),
      projectWith(["past"]),
      projectWith(["future"]),
    ]);
    expect(registry.get("current")).toBe(current);
    expect(registry.get("past")).toBe(past);
    expect(registry.get("future")).toBe(future);
    // Only the unreachable doc is released and removed.
    expect(releases[0]).not.toHaveBeenCalled();
    expect(releases[1]).not.toHaveBeenCalled();
    expect(releases[2]).not.toHaveBeenCalled();
    expect(releases[3]).toHaveBeenCalledOnce();
    expect(registry.get("orphan")).toBeUndefined();
  });

  it("is idempotent", () => {
    const registry = new BitmapRegistry();
    const doc = stubDoc("orphan");
    const release = vi.spyOn(doc, "release");
    registry.add(doc);
    const projects: EditorProject[] = [projectWith(["x"])];
    registry.reconcile(projects);
    registry.reconcile(projects);
    expect(release).toHaveBeenCalledOnce();
  });

  it("empty projects list releases everything", () => {
    const registry = new BitmapRegistry();
    const doc = stubDoc("a");
    const release = vi.spyOn(doc, "release");
    registry.add(doc);
    registry.reconcile([]);
    expect(release).toHaveBeenCalledOnce();
    expect(registry.list()).toHaveLength(0);
  });
});
