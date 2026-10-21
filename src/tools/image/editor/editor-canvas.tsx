"use client";

/**
 * Interactive canvas viewport: renders the project with renderProject and
 * adds pointer interactions — select, move, resize (corner handles),
 * rotate (handle above top edge), pan (space or middle-drag / two-finger),
 * and crop-overlay rectangle. Preview renders at capped resolution and
 * requestAnimationFrame-batches redraws.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EditorAction, EditorState } from "./state";
import type { EditorLayer } from "../types/editor";
import type { CropRect } from "../processing/geometry";
import { BitmapRegistry, renderProject } from "../processing/render";
import { clampCrop, applyAspectToCrop, clamp } from "../processing/geometry";

type HandleId = "nw" | "ne" | "se" | "sw" | "rotate" | "box-e" | "box-s";

interface EditorCanvasProps {
  state: EditorState;
  registry: BitmapRegistry;
  dispatch: (a: EditorAction) => void;
  /** Crop overlay active; reports the rect in canvas coords. */
  cropDraft: CropRect | null;
  onCropDraftChange: (rect: CropRect | null) => void;
  /** Runtime-measured text bounds so selection boxes fit text layers. */
  textMeasures: Map<string, { width: number; height: number }>;
  /** Split-mode regions drawn as a dashed overlay (canvas coords). */
  splitRegions?: { id: string; x: number; y: number; width: number; height: number }[];
  /** Custom guide cut positions (canvas px), split mode. */
  splitGuides?: { x: number[]; y: number[] } | null;
  /** Called while a guide line is dragged (position in canvas px). */
  onSplitGuideDrag?: (axis: "x" | "y", index: number, position: number) => void;
  /** Numeric aspect ratio applied to the crop draft (null = free). */
  cropAspectValue?: number | null;
  /** Called when a text layer is double-clicked (focus its content field). */
  onRequestTextFocus?: (layerId: string) => void;
}

type Drag =
  | { kind: "move"; id: string; startX: number; startY: number; layerX: number; layerY: number }
  | { kind: "resize"; id: string; handle: "nw" | "ne" | "se" | "sw"; start: { w: number; h: number; x: number; y: number }; origin: { x: number; y: number }; aspect: number }
  | { kind: "rotate"; id: string; centerX: number; centerY: number; startAngle: number; startRotation: number }
  | { kind: "pan"; startX: number; startY: number; startScrollX: number; startScrollY: number }
  | { kind: "crop"; anchorX: number; anchorY: number; current: CropRect }
  | { kind: "guide"; axis: "x" | "y"; index: number };

export function EditorCanvas({
  state,
  registry,
  dispatch,
  cropDraft,
  onCropDraftChange,
  textMeasures,
  splitRegions = [],
  splitGuides = null,
  onSplitGuideDrag,
  cropAspectValue = null,
  onRequestTextFocus,
}: EditorCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const dragRef = useRef<Drag | null>(null);
  const rafRef = useRef(0);

  const { project } = state;
  const selected = useMemo(
    () => project.layers.find((l) => l.id === state.selectedLayerId) ?? null,
    [project.layers, state.selectedLayerId],
  );

  /* ── Fit-to-viewport zoom ─────────────────────────────── */

  const fitScale = useMemo(() => {
    const pad = 48;
    return Math.min(
      (viewport.width - pad) / project.canvas.width,
      (viewport.height - pad) / project.canvas.height,
      1,
    );
  }, [viewport, project.canvas.width, project.canvas.height]);

  const scale = state.ui.fitZoom ? fitScale : state.ui.zoom;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setViewport({ width: box.width || 800, height: box.height || 600 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Render loop ─────────────────────────────────────── */

  const draw = useCallback(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(project.canvas.width * scale);
    const ch = Math.round(project.canvas.height * scale);
    if (cnv.width !== cw * dpr || cnv.height !== ch * dpr) {
      cnv.width = Math.max(1, cw * dpr);
      cnv.height = Math.max(1, ch * dpr);
      cnv.style.width = `${cw}px`;
      cnv.style.height = `${ch}px`;
    }
    const ctx = cnv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    try {
      // Fast during drags/slider interactions: skips the O(n·3) unsharp
      // mask so pointer tracking stays responsive on large images.
      renderProject(ctx, project, registry, { scale, fast: state.ui.transientSession });
      // Split-mode region overlay: dashed outlines + index labels over
      // the composite so users see exactly what will be exported.
      if (splitRegions.length > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = Math.max(1, 1.5 * dpr);
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.font = `${Math.max(10, 11 * dpr)}px sans-serif`;
        ctx.textBaseline = "top";
        for (const region of splitRegions) {
          const rx = region.x * scale;
          const ry = region.y * scale;
          const rw = region.width * scale;
          const rh = region.height * scale;
          ctx.strokeRect(rx, ry, rw, rh);
          // Label chip with region index, positioned inside the top-left.
          const label = region.id.replace(/^r/, "").replace(/c/, "-");
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          const tw = ctx.measureText(label).width;
          ctx.fillRect(rx + 3, ry + 3, tw + 10, 18);
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.fillText(label, rx + 8, ry + 6);
          ctx.restore();
        }
        ctx.restore();
      }
    } catch {
      // A released bitmap mid-render: skip this frame; next draw fixes it.
    }
  }, [project, registry, scale, state.ui.transientSession, splitRegions]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  /* ── Coordinate mapping ───────────────────────────────── */

  const canvasToProject = useCallback(
    (clientX: number, clientY: number) => {
      const cnv = canvasRef.current;
      if (!cnv) return { x: 0, y: 0 };
      const rect = cnv.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  /* ── Layer hit-testing (uses measured text bounds) ─────── */

  const hitTest = useCallback(
    (x: number, y: number): EditorLayer | null => {
      // Topmost first.
      for (let i = project.layers.length - 1; i >= 0; i--) {
        const layer = project.layers[i];
        if (!layer.visible) continue;
        const w =
          layer.type === "text"
            ? (textMeasures.get(layer.id)?.width ?? layer.boxWidth)
            : layer.width;
        const h =
          layer.type === "text"
            ? (textMeasures.get(layer.id)?.height ?? layer.fontSize * layer.lineHeight)
            : layer.height;
        // Rotate point into layer space.
        const dx = x - layer.x;
        const dy = y - layer.y;
        const rad = (-layer.rotation * Math.PI) / 180;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        const pad = 4;
        if (lx >= -w / 2 - pad && lx <= w / 2 + pad && ly >= -h / 2 - pad && ly <= h / 2 + pad) {
          return layer;
        }
      }
      return null;
    },
    [project.layers, textMeasures],
  );

  /* ── Pointer handlers ─────────────────────────────────── */

  /* ── Rotate helper: angle of pointer around a canvas-space center ── */

  const pointerAngle = useCallback(
    (clientX: number, clientY: number, centerX: number, centerY: number) => {
      const cnv = canvasRef.current;
      if (!cnv) return 0;
      const rect = cnv.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return (Math.atan2(py - centerY * scale, px - centerX * scale) * 180) / Math.PI;
    },
    [scale],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Pinch zoom: track a second pointer on the canvas region.
    if (pinchRef.current || e.isPrimary === false) {
      const pinch = pinchRef.current ?? {
        pointers: new Map(),
        startDistance: 0,
        startZoom: scale,
      };
      pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.pointers.size === 2) {
        const [p1, p2] = [...pinch.pointers.values()];
        pinch.startDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinch.startZoom = scale;
        pinchRef.current = pinch;
        dragRef.current = null; // pinch cancels any layer drag
      } else {
        pinchRef.current = pinch;
      }
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Pan: middle mouse, or space+drag anywhere.
    if (e.button === 1 || (spaceDown && !target.dataset.handle)) {
      const wrap = wrapRef.current;
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        startScrollX: wrap?.scrollLeft ?? 0,
        startScrollY: wrap?.scrollTop ?? 0,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    // Split-mode guide drag: grabbing a guide line repositions the cut.
    if (target.dataset.guideAxis === "x" || target.dataset.guideAxis === "y") {
      dragRef.current = {
        kind: "guide",
        axis: target.dataset.guideAxis,
        index: Number(target.dataset.guideIndex),
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // Crop mode: drag out a crop rectangle directly on the canvas.
    if (state.mode === "crop") {
      const { x, y } = canvasToProject(e.clientX, e.clientY);
      dragRef.current = { kind: "crop", anchorX: x, anchorY: y, current: { x, y, width: 0, height: 0 } };
      onCropDraftChange({ x, y, width: 0, height: 0 });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (!target.dataset.handle) {
      // Canvas click: clear selection or hit-test a layer.
      const { x, y } = canvasToProject(e.clientX, e.clientY);
      const layer = hitTest(x, y);
      dispatch({ type: "select-layer", id: layer?.id ?? null });
      if (layer && !layer.locked) {
        dragRef.current = {
          kind: "move",
          id: layer.id,
          startX: e.clientX,
          startY: e.clientY,
          layerX: layer.x,
          layerY: layer.y,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
      return;
    }
    if (target.dataset.handle === "crop") return; // overlay passthrough
    // Handle interactions.
    const handle = target.dataset.handle as HandleId;
    if (!selected || selected.locked) return;
    const cx = selected.x;
    const cy = selected.y;
    if (handle === "rotate") {
      dragRef.current = {
        kind: "rotate",
        id: selected.id,
        centerX: cx,
        centerY: cy,
        startAngle: pointerAngle(e.clientX, e.clientY, cx, cy),
        startRotation: selected.rotation,
      };
    } else if (handle === "box-e" || handle === "box-s") {
      // Text box resize: keep center, grow box width.
      dragRef.current = {
        kind: "resize",
        id: selected.id,
        handle: "se",
        start: {
          w: selected.type === "text" ? selected.boxWidth : selected.width,
          h:
            selected.type === "text"
              ? (textMeasures.get(selected.id)?.height ?? selected.fontSize * selected.lineHeight)
              : selected.height,
          x: selected.x,
          y: selected.y,
        },
        origin: { x: e.clientX, y: e.clientY },
        aspect: 0,
      };
    } else {
      dragRef.current = {
        kind: "resize",
        id: selected.id,
        handle: handle as "nw" | "ne" | "se" | "sw",
        start: {
          w: selected.type === "text" ? selected.boxWidth : selected.width,
          h: selected.type === "text" ? (textMeasures.get(selected.id)?.height ?? selected.fontSize * 2) : selected.height,
          x: selected.x,
          y: selected.y,
        },
        origin: { x: e.clientX, y: e.clientY },
        aspect:
          selected.type === "text"
            ? 0
            : selected.width / selected.height,
      };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pinch: update tracked pointers; when both are live, zoom by distance.
    const pinch = pinchRef.current;
    if (pinch) {
      if (pinch.pointers.has(e.pointerId)) {
        pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (pinch.pointers.size === 2 && pinch.startDistance > 0) {
        const [p1, p2] = [...pinch.pointers.values()];
        const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const next = Math.min(8, Math.max(0.05, (pinch.startZoom * distance) / pinch.startDistance));
        if (next !== scale) {
          dispatch({ type: "set-zoom", zoom: next });
        }
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "pan") {
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.scrollLeft = drag.startScrollX - (e.clientX - drag.startX);
      wrap.scrollTop = drag.startScrollY - (e.clientY - drag.startY);
      return;
    }
    if (drag.kind === "move") {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      dispatch({
        type: "update-layer",
        id: drag.id,
        patch: { x: drag.layerX + dx, y: drag.layerY + dy },
        transient: true,
      });
    } else if (drag.kind === "resize") {
      const layer = project.layers.find((l) => l.id === drag.id);
      if (!layer) return;
      const dx = (e.clientX - drag.origin.x) / scale;
      const dy = (e.clientY - drag.origin.y) / scale;
      // Opposite-corner-anchored resizing.
      let newW = drag.start.w;
      let newH = drag.start.h;
      if (drag.handle === "se") {
        newW = drag.start.w + dx;
        newH = drag.aspect ? newW / drag.aspect : drag.start.h + dy;
      } else if (drag.handle === "nw") {
        newW = drag.start.w - dx;
        newH = drag.aspect ? newW / drag.aspect : drag.start.h - dy;
      } else if (drag.handle === "ne") {
        newW = drag.start.w + dx;
        newH = drag.aspect ? newW / drag.aspect : drag.start.h - dy;
      } else if (drag.handle === "sw") {
        newW = drag.start.w - dx;
        newH = drag.aspect ? newW / drag.aspect : drag.start.h + dy;
      }
      newW = Math.max(8, newW);
      newH = Math.max(8, newH);
      // Keep the anchor corner fixed: center shifts by half the delta on
      // the moved axes, adjusted for sign.
      const dw = newW - drag.start.w;
      const dh = newH - drag.start.h;
      const sxSign = drag.handle === "se" || drag.handle === "ne" ? 0.5 : -0.5;
      const sySign = drag.handle === "se" || drag.handle === "sw" ? 0.5 : -0.5;
      const patch: Partial<EditorLayer> =
        layer.type === "text"
          ? // Text: only the box + font scale — never write width/height
            // (junk props on TextLayer).
            {
              boxWidth: Math.max(24, newW),
              fontSize: Math.max(
                8,
                (layer as import("../types/editor").TextLayer).fontSize * (newW / drag.start.w),
              ),
            }
          : { width: newW, height: newH };
      dispatch({
        type: "update-layer",
        id: drag.id,
        patch: {
          ...patch,
          x: drag.start.x + dw * sxSign,
          y: drag.start.y + dh * sySign,
        },
        transient: true,
      });
    } else if (drag.kind === "rotate") {
      const angle = pointerAngle(e.clientX, e.clientY, drag.centerX, drag.centerY);
      let rotation = drag.startRotation + (angle - drag.startAngle);
      rotation = ((rotation % 360) + 360) % 360;
      // Snap to 15° increments near multiples.
      const snap = Math.round(rotation / 15) * 15;
      if (Math.abs(rotation - snap) < 4) rotation = snap;
      dispatch({
        type: "update-layer",
        id: drag.id,
        patch: { rotation },
        transient: true,
      });
    } else if (drag.kind === "crop") {
      const cur = canvasToProject(e.clientX, e.clientY);
      const rect = {
        x: Math.min(drag.anchorX, cur.x),
        y: Math.min(drag.anchorY, cur.y),
        width: Math.abs(cur.x - drag.anchorX),
        height: Math.abs(cur.y - drag.anchorY),
      };
      const withAspect = cropAspectValue
        ? applyAspectToCrop(rect, cropAspectValue, project.canvas.width, project.canvas.height)
        : rect;
      onCropDraftChange(clampCrop(withAspect, project.canvas.width, project.canvas.height));
    } else if (drag.kind === "guide") {
      const cur = canvasToProject(e.clientX, e.clientY);
      const bound =
        drag.axis === "x" ? project.canvas.width : project.canvas.height;
      const raw = drag.axis === "x" ? cur.x : cur.y;
      onSplitGuideDrag?.(drag.axis, drag.index, clamp(raw, 1, Math.max(1, bound - 1)));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pinch bookkeeping: drop the pointer; end the gesture below 2 pointers.
    const pinch = pinchRef.current;
    if (pinch) {
      pinch.pointers.delete(e.pointerId);
      if (pinch.pointers.size < 2) pinchRef.current = null;
    }
    const drag = dragRef.current;
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    if (drag && drag.kind !== "pan") dispatch({ type: "commit" });
  };

  /* ── Wheel: zoom (ctrl/⌘ or plain wheel outside interactions) ── */

  /* ── Pan: space+drag, middle-drag; Pinch: 2 pointers ───── */

  const [spaceDown, setSpaceDown] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const t = e.target as HTMLElement;
        if (t.closest("input, textarea, select, button")) return;
        // Prevent the page from scrolling while space-pan is armed.
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Active pinch gesture (two pointers on the canvas wrapper).
  const pinchRef = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    startDistance: number;
    startZoom: number;
  } | null>(null);

  /** Zoom keeping the point under the cursor stationary (scroll-anchored). */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const next = Math.min(8, Math.max(0.05, scale * factor));
      if (next === scale) return;
      // Cursor position relative to the scrollable content.
      const cursorX = clientX - wrap.getBoundingClientRect().left + wrap.scrollLeft;
      const cursorY = clientY - wrap.getBoundingClientRect().top + wrap.scrollTop;
      // Content point under the cursor (canvas coords) stays fixed:
      // scroll' = cursor' - point * scale'
      const pointX = (cursorX - 24) / scale; // 24px = centering padding
      const pointY = (cursorY - 24) / scale;
      dispatch({ type: "set-zoom", zoom: next });
      // Adjust scroll after the DOM updates size (next frame) so the same
      // canvas point stays under the cursor:
      // scrollLeft' = point * scale' + padding − cursorViewportX'
      requestAnimationFrame(() => {
        const wrap2 = wrapRef.current;
        if (!wrap2) return;
        const vx = clientX - wrap2.getBoundingClientRect().left;
        const vy = clientY - wrap2.getBoundingClientRect().top;
        wrap2.scrollLeft = pointX * next + 24 - vx;
        wrap2.scrollTop = pointY * next + 24 - vy;
      });
    },
    [scale, dispatch],
  );

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      // Pinch-gesture on trackpads arrives as ctrl+wheel; zoom at cursor.
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
    } else if (e.shiftKey) {
      // Shift+wheel: horizontal scroll (browser default handles vertical)
      return;
    } else if (state.ui.fitZoom === false && (e.deltaX !== 0 || e.deltaY !== 0)) {
      // Plain wheel pans the scrollable viewport when zoomed in.
      return;
    }
  };

  /* ── Keyboard nudging (canvas focused) ─────────────────── */

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (state.mode !== "select") return;
    const selectedId = state.selectedLayerId;
    if (!selectedId) return;
    const layer = project.layers.find((l) => l.id === selectedId);
    if (!layer || layer.locked) return;
    const step = e.shiftKey ? 10 : 1;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    dispatch({ type: "update-layer", id: selectedId, patch: { x: layer.x + dx, y: layer.y + dy } });
  };

  /* ── Selection overlay geometry ────────────────────────── */

  const selectionStyle = useMemo((): React.CSSProperties | null => {
    if (!selected) return null;
    const w =
      selected.type === "text"
        ? (textMeasures.get(selected.id)?.width ?? selected.boxWidth)
        : selected.width;
    const h =
      selected.type === "text"
        ? (textMeasures.get(selected.id)?.height ?? selected.fontSize * selected.lineHeight)
        : selected.height;
    return {
      left: selected.x * scale,
      top: selected.y * scale,
      width: w * scale,
      height: h * scale,
      transform: `rotate(${selected.rotation}deg)`,
      transformOrigin: "center",
    };
  }, [selected, scale, textMeasures]);

  return (
    <div
      ref={wrapRef}
      className="editor-canvas relative flex-1 min-h-0 overflow-auto rounded-xl border bg-[radial-gradient(circle_at_1px_1px,--alpha(rgb(148_163_184/0.25))_1px,transparent_0)] [background-size:16px_16px]"
      onWheel={onWheel}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Image canvas. Use arrow keys to nudge the selected layer."
      data-testid="editor-canvas"
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        <div
          className="relative"
          style={{ width: project.canvas.width * scale, height: project.canvas.height * scale }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(e) => {
            // Double-click a text layer: select it and signal the editor
            // to focus the content field in the properties panel.
            const { x, y } = canvasToProject(e.clientX, e.clientY);
            const layer = hitTest(x, y);
            if (layer?.type === "text") {
              dispatch({ type: "select-layer", id: layer.id });
              onRequestTextFocus?.(layer.id);
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className="block touch-none"
            style={{
              borderRadius: `${project.canvas.borderRadius * scale}px`,
            }}
          />
          {/* Selection frame + handles */}
          {selected && state.mode === "select" && !cropDraft && (
            <div
              className="pointer-events-none absolute outline-2 outline-primary"
              style={selectionStyle ?? undefined}
              data-testid="layer-selection"
            >
              <div
                data-handle="nw"
                className="pointer-events-auto absolute -top-1.5 -left-1.5 size-3 cursor-nwse-resize rounded-sm border border-primary bg-background"
                role="button"
                aria-label="Resize handle north-west"
              />
              <div
                data-handle="ne"
                className="pointer-events-auto absolute -top-1.5 -right-1.5 size-3 cursor-nesw-resize rounded-sm border border-primary bg-background"
                role="button"
                aria-label="Resize handle north-east"
              />
              <div
                data-handle="se"
                className="pointer-events-auto absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border border-primary bg-background"
                role="button"
                aria-label="Resize handle south-east"
              />
              <div
                data-handle="sw"
                className="pointer-events-auto absolute -bottom-1.5 -left-1.5 size-3 cursor-nesw-resize rounded-sm border border-primary bg-background"
                role="button"
                aria-label="Resize handle south-west"
              />
              <div
                data-handle="rotate"
                className="pointer-events-auto absolute -top-8 left-1/2 size-3.5 -translate-x-1/2 cursor-grab rounded-full border border-primary bg-background"
                role="button"
                aria-label="Rotate layer"
              />
            </div>
          )}
          {/* Split guide lines (custom cuts): draggable */}
          {splitGuides && (
            <>
              {splitGuides.x.map((px, i) => (
                <div
                  key={`gx-${i}`}
                  data-guide-axis="x"
                  data-guide-index={i}
                  className="absolute top-0 bottom-0 w-2 -translate-x-1/2 cursor-col-resize touch-none"
                  style={{ left: px * scale }}
                  role="slider"
                  aria-label={`Vertical cut ${i + 1} at ${Math.round(px)}px`}
                  aria-valuenow={Math.round(px)}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(project.canvas.width)}
                  tabIndex={0}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary/70 shadow-[0_0_0_1px_rgba(255,255,255,0.5)]" />
                </div>
              ))}
              {splitGuides.y.map((py, i) => (
                <div
                  key={`gy-${i}`}
                  data-guide-axis="y"
                  data-guide-index={i}
                  className="absolute left-0 right-0 h-2 -translate-y-1/2 cursor-row-resize touch-none"
                  style={{ top: py * scale }}
                  role="slider"
                  aria-label={`Horizontal cut ${i + 1} at ${Math.round(py)}px`}
                  aria-valuenow={Math.round(py)}
                  aria-valuemin={0}
                  aria-valuemax={Math.round(project.canvas.height)}
                  tabIndex={0}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-primary/70 shadow-[0_0_0_1px_rgba(255,255,255,0.5)]" />
                </div>
              ))}
            </>
          )}
          {/* Crop overlay */}
          {cropDraft && (
            <>
              <div
                className="absolute inset-0 bg-black/45"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropDraft.x * scale}px ${cropDraft.y * scale}px, ${(cropDraft.x + cropDraft.width) * scale}px ${cropDraft.y * scale}px, ${(cropDraft.x + cropDraft.width) * scale}px ${(cropDraft.y + cropDraft.height) * scale}px, ${cropDraft.x * scale}px ${(cropDraft.y + cropDraft.height) * scale}px, ${cropDraft.x * scale}px ${cropDraft.y * scale}px)`,
                }}
                aria-hidden
              />
              <div
                className="absolute border-2 border-primary"
                style={{
                  left: cropDraft.x * scale,
                  top: cropDraft.y * scale,
                  width: cropDraft.width * scale,
                  height: cropDraft.height * scale,
                }}
                data-testid="crop-overlay"
              >
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-60">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/40" />
                  ))}
                </div>
                <p
                  className="absolute -top-7 left-0 rounded bg-primary px-1.5 py-0.5 text-xs tabular-nums text-primary-foreground"
                  aria-live="polite"
                >
                  {Math.round(cropDraft.width)} × {Math.round(cropDraft.height)}
                </p>
                <div
                  data-handle="crop"
                  className="absolute inset-0 cursor-crosshair"
                  aria-label="Adjust crop region"
                />
              </div>
            </>
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {selected ? `Selected ${selected.name}` : "No layer selected"}
      </span>
    </div>
  );
}
