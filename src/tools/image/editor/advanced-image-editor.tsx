"use client";

/**
 * Advanced Image Editor — one unified Devly tool.
 *
 * ARCHITECTURE NOTE (library evaluation): filerobot-image-editor was
 * evaluated and rejected: it bundles Konva (~350kB gz), has no layer
 * z-order, no merge/split/collage, imposes its own theme, and would
 * duplicate (not share) processing logic with Devly's existing image
 * tools. The editor is built on Canvas 2D + createImageBitmap with
 * pure-function processing modules and zero new dependencies.
 *
 * Modes (all in ONE tool): select, crop, adjust, filters, text,
 * elements, canvas, background-removal, merge, split, collage.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UploadZone, type UploadedFile } from "@/components/upload-zone";
import { ToolContainer } from "@/components/tool-forms";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  editorReducer,
  initialEditorState,
  makeImageLayer,
  makeTextLayer,
  COLLAGE_SLOT_COUNTS,
  type EditorState,
} from "./state";
import { EditorCanvas } from "./editor-canvas";
import { EditorToolbar } from "./editor-toolbar";
import { EditorHeader } from "./editor-header";
import { PropertiesPanel } from "./properties-panel";
import { LayersPanel } from "./layers-panel";
import {
  MergePanel,
  SplitPanel,
  CollagePanel,
  BackgroundRemovalPanel,
} from "./multi-image-panels";
import { ExportDialog } from "./export-dialog";
import {
  BitmapRegistry,
  fileToImageDoc,
  measureTextLayer,
} from "../processing/render";
import {
  exportProject,
  exportSplit,
  exportMerge,
  exportCollage,
  buildCollageProject,
  buildMergeProject,
  renderCollageProject,
  releaseScratchBitmaps,
  zipExportFiles,
  type ExportResult,
  type ScratchBitmap,
} from "../processing/export";
import { computeSplitRegions, clampCrop, straightenCanvasSize, normalizeGuides } from "../processing/geometry";
import { friendlyError } from "../processing/errors";
import type { CropRect } from "../processing/geometry";
import type {
  ImageLayer,
  MergeOptions,
  SplitOptions,
  CollageState,
  CollageTemplateId,
  ExportFormat,
  EditorProject,
} from "../types/editor";
import { DEFAULT_CANVAS } from "../types/editor";
import {
  checkBgRemovalCapability,
  removeBackground,
} from "./background-removal";

const MAX_IMPORT_FILES = 12;
const MAX_IMPORT_MB = 50;

export function AdvancedImageEditor(props: ToolComponentProps) {
  void props;
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    initialEditorState(),
  );
  const [registry] = useState(() => new BitmapRegistry());
  // Note: registry lifetime is managed below in the unmount effect.

  const [importing, setImporting] = useState(false);
  /** Staged files shown in the import zone for feedback. */
  const [stagedFiles, setStagedFiles] = useState<UploadedFile[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  /** Non-destructive import notices (downscale etc.) — separate from errors. */
  const [importNotices, setImportNotices] = useState<string[]>([]);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  /**
   * Signatures (name+size+lastModified) of files already imported. The
   * UploadZone reports the same logical File as a *new* File object on
   * re-drop (input.value reset creates a fresh FileList), so identity-based
   * dedupe misses; metadata keys are stable across drops and pastes.
   */
  const processedSignaturesRef = useRef(new Set<string>());

  const fileSignature = (file: File): string =>
    `${file.name}::${file.size}::${file.lastModified}`;

  const [cropDraft, setCropDraft] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState("free");
  const [straighten, setStraighten] = useState(0);
  /** Text layer id pending content-field focus (double-click on canvas). */
  const [textFocusId, setTextFocusId] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const [mergeOptions, setMergeOptions] = useState<MergeOptions>({
    layout: "vertical",
    spacing: 16,
    padding: 16,
    background: "#ffffff",
    align: "center",
    columns: 2,
    cellRadius: 0,
  });
  /** Custom merge order (docIds); null = import order. */
  const [mergeOrder, setMergeOrder] = useState<string[] | null>(null);
  const [mergeBusy, setMergeBusy] = useState(false);

  const [splitOptions, setSplitOptions] = useState<SplitOptions>({
    mode: "grid",
    rows: 2,
    columns: 2,
    evenly: true,
  });
  const [splitBusy, setSplitBusy] = useState(false);

  const [collageBusy, setCollageBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const [bgBusy, setBgBusy] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const [bgStatus, setBgStatus] = useState("");
  const [bgError, setBgError] = useState<string | null>(null);
  // Capability probe is safe during render: it only touches DOM APIs when
  // they exist, and returns a stable "unavailable" during prerender.
  const bgCapability = useMemo(() => checkBgRemovalCapability(), []);

  const isMobile = useIsMobile();
  const [panelSheet, setPanelSheet] = useState(false);
  // Tablet (md..lg): two-panel layout with the properties in a bottom sheet.
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const [tabletPanelOpen, setTabletPanelOpen] = useState(false);

  // Text layer measurement cache. Computed during render on the client
  // (guarded: canvas API is unavailable during prerender). Measurement is
  // deterministic for a given layers array, so caching by reference is safe.
  const textMeasures = useMemo(() => {
    const map = new Map<string, { width: number; height: number }>();
    if (typeof document === "undefined") return map;
    const cnv = document.createElement("canvas");
    const ctx = cnv.getContext("2d");
    if (!ctx) return map;
    for (const layer of state.project.layers) {
      if (layer.type !== "text") continue;
      try {
        const m = measureTextLayer(ctx, layer);
        map.set(layer.id, { width: m.width, height: m.height });
      } catch {
        /* renderer will fall back to estimated bounds */
      }
    }
    return map;
     
  }, [state.project.layers]);

  const registryForCleanup = registry;
  useEffect(() => {
    return () => {
      registryForCleanup.releaseAll();
    };
  }, [registryForCleanup]);

  /* ── Import ────────────────────────────────────────────── */

  const handleImportFiles = useCallback(
    async (uploaded: UploadedFile[]) => {
      // Stage the files so the import zone shows names/errors as feedback.
      setStagedFiles(uploaded);
      setImportError(null);
      setImportNotices([]);
      // Dedupe by file signature: re-dropping or re-pasting the same file
      // (same name/size/lastModified) is skipped instead of double-imported.
      const fresh = uploaded.filter(
        (f) =>
          f.status === "valid" &&
          !processedSignaturesRef.current.has(fileSignature(f.file)),
      );
      const invalid = uploaded.find((f) => f.status === "invalid");
      if (fresh.length === 0) {
        if (invalid?.error) setImportError(invalid.error);
        return;
      }
      for (const uf of fresh) processedSignaturesRef.current.add(fileSignature(uf.file));
      setImporting(true);
      const loaded: { docId: string; name: string; width: number; height: number }[] = [];
      const errors: string[] = [];
      const notices: string[] = [];
      for (const uf of fresh.slice(0, MAX_IMPORT_FILES)) {
        const { doc, error, downscale } = await fileToImageDoc(uf.file);
        if (doc) {
          registry.add(doc);
          loaded.push({ docId: doc.id, name: doc.name, width: doc.width, height: doc.height });
          if (downscale) {
            notices.push(`"${doc.name}" was downscaled to ${doc.width}×${doc.height}px to keep the editor responsive.`);
          }
        } else if (error) {
          errors.push(error);
        }
      }
      setImporting(false);

      if (loaded.length > 0) {
        // First import sets canvas size & becomes the base image layer.
        let first = true;
        for (const img of loaded) {
          if (first && state.project.layers.length === 0) {
            const layer = makeImageLayer(
              img.docId,
              img.name,
              img.width,
              img.height,
              img.width,
              img.height,
            );
            dispatch({
              type: "load-project",
              project: {
                canvas: {
                  width: img.width,
                  height: img.height,
                  background: "transparent",
                  borderRadius: 0,
                  padding: 0,
                  border: { style: "none", color: "#ffffff", width: 0 },
                  aspectPreset: "original",
                },
                layers: [layer],
              },
            });
            // Select the base image so property panels are immediately useful.
            dispatch({ type: "select-layer", id: layer.id });
            first = false;
          } else {
            dispatch({
              type: "add-layer",
              layer: makeImageLayer(
                img.docId,
                img.name,
                img.width,
                img.height,
                state.project.canvas.width || img.width,
                state.project.canvas.height || img.height,
              ),
            });
          }
        }
        setImportSheetOpen(false);
        setImportNotices(notices);
        if (errors.length) setImportError(errors.join(" "));
      } else {
        setImportError(errors[0] ?? "No images could be loaded.");
      }
    },
    [registry, state.project.layers.length, state.project.canvas.width, state.project.canvas.height],
  );

  // Include layers in deps so the doc list refreshes after imports.
  // Registry contents change on import (registry.add) and after reconcile
  // (registry.release) — neither is React state, so the memo keys on the
  // same project/history references the reconcile effect reacts to. Any
  // one-frame stale entry is inert (registry.get → undefined → filtered).
  const docs = useMemo(
    () => registry.list(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registry, importing, state.project.layers, state.history.past, state.history.future],
  );

  /* ── Editor-wide clipboard paste ───────────────────────── */

  // Paste images from the OS clipboard anywhere in the editor (skips when
  // typing in a text field so pasting text still works normally).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const images: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const file = items[i].getAsFile();
        if (
          file &&
          file.type.startsWith("image/") &&
          !processedSignaturesRef.current.has(fileSignature(file))
        ) {
          images.push(file);
        }
      }
      if (images.length === 0) return;
      e.preventDefault();
      void handleImportFiles(
        images.map((file) => ({
          id: `paste-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          status: "valid" as const,
        })),
      );
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleImportFiles]);

  /* ── Registry reconcile ──────────────────────────────── */

  // Release decoded bitmaps that no reachable project (current + undo past
  // + redo future + collage slots) references. Keeps memory in check as
  // images are removed or reset while history stays fully undoable.
  const registryRef = registry;
  const historyPast = state.history.past;
  const historyFuture = state.history.future;
  const currentProject = state.project;
  const collageSlots = state.collage?.slots ?? null;
  useEffect(() => {
    // Run after commit so transient drags don't thrash the registry.
    if (state.ui.transientSession) return;
    // Collage slots hold docIds outside the layer tree — represent them as
    // a synthetic project so their bitmaps survive reconciliation.
    const collageProject: EditorProject | null =
      collageSlots && collageSlots.some((s) => s.docId)
        ? {
            canvas: DEFAULT_CANVAS,
            layers: collageSlots
              .filter((s) => s.docId)
              .map((s) => makeImageLayer(s.docId!, "collage", 1, 1, 1, 1)),
          }
        : null;
    registryRef.reconcile([
      currentProject,
      ...historyPast,
      ...historyFuture,
      ...(collageProject ? [collageProject] : []),
    ]);
    // Docs released here leave the merge/collage pickers on the next
    // commit (docs memo re-evaluates with the same triggers); consumers
    // already tolerate a one-frame stale list (registry.get → undefined
    // is filtered out), so no explicit version state is needed.
  }, [
    registryRef,
    currentProject,
    historyPast,
    historyFuture,
    collageSlots,
    state.ui.transientSession,
  ]);

  /* ── Crop apply ───────────────────────────────────────── */

  /**
   * The crop draft is in canvas coordinates. The crop applies to the
   * target image layer when it is axis-aligned (rotation % 90 === 0) and
   * covers the full canvas (the standard "crop the photo" case). For
   * rotated targets the Apply button is disabled with guidance instead.
   */
  const cropTarget: ImageLayer | null = useMemo(() => {
    const selectedImg = state.project.layers.find(
      (l) => l.id === state.selectedLayerId && l.type === "image",
    ) as ImageLayer | undefined;
    return (selectedImg ?? (state.project.layers.find((l) => l.type === "image") as ImageLayer | undefined)) ?? null;
  }, [state.project.layers, state.selectedLayerId]);

  const cropTargetRotated = !!cropTarget && Math.abs(cropTarget.rotation % 90) !== 0;

  const applyCrop = useCallback(() => {
    if (!cropDraft || cropDraft.width < 4 || cropDraft.height < 4) return;
    const target = cropTarget;
    if (!target || cropTargetRotated) return;
    const doc = registry.get(target.docId);
    const canvasW = state.project.canvas.width;
    const canvasH = state.project.canvas.height;
    // Map canvas coords → source pixels through the layer's current crop
    // box: the layer may already be cropped, and its drawn box maps 1:1
    // onto the canvas only when it fills it (fit=stretch or default
    // import). For the base-layer case width/height == canvas size.
    const srcW = target.crop?.width ?? doc?.width ?? target.width;
    const srcH = target.crop?.height ?? doc?.height ?? target.height;
    const scaleX = srcW / target.width;
    const scaleY = srcH / target.height;
    const baseX = target.crop?.x ?? 0;
    const baseY = target.crop?.y ?? 0;
    // Layer-local position of the canvas origin (layer may be smaller or
    // offset on the canvas); for the default base layer this is (0,0).
    const localX = target.x - target.width / 2;
    const localY = target.y - target.height / 2;
    const rawX = baseX + (cropDraft.x - localX) * scaleX;
    const rawY = baseY + (cropDraft.y - localY) * scaleY;
    const rawW = cropDraft.width * scaleX;
    const rawH = cropDraft.height * scaleY;
    const nextCrop = clampCrop({ x: rawX, y: rawY, width: rawW, height: rawH }, srcW, srcH);
    dispatch({
      type: "crop-canvas",
      layerId: target.id,
      crop: nextCrop,
      canvasWidth: Math.round(cropDraft.width),
      canvasHeight: Math.round(cropDraft.height),
      originX: cropDraft.x,
      originY: cropDraft.y,
    });
    void canvasW; void canvasH;
    setCropDraft(null);
  }, [cropDraft, cropTarget, cropTargetRotated, state.project.canvas.width, state.project.canvas.height, registry]);

  /**
   * Straighten: rotates the base image by the angle and grows the canvas
   * to the rotated bounding box so nothing is cut off. Undo-able as a
   * single transient interaction (slider coalesces to one entry).
   */
  const handleStraighten = useCallback(
    (angle: number) => {
      setStraighten(angle);
      const target = cropTarget;
      if (!target) return;
      const base = angle === 0 ? null : angle;
      const size = straightenCanvasSize(target.width, target.height, angle);
      dispatch({
        type: "update-layer",
        id: target.id,
        patch: { rotation: base ?? 0 },
        transient: true,
      });
      if (size.width !== state.project.canvas.width || size.height !== state.project.canvas.height) {
        dispatch({
          type: "set-canvas",
          patch: { width: size.width, height: size.height },
          transient: true,
        });
      }
    },
    [cropTarget, state.project.canvas.width, state.project.canvas.height],
  );

  /** Double-clicked a text layer: switch to Text mode and focus content. */
  const handleRequestTextFocus = useCallback((layerId: string) => {
    dispatch({ type: "set-mode", mode: "text" });
    dispatch({ type: "select-layer", id: layerId });
    setTextFocusId(layerId);
    if (isMobile) setPanelSheet(true);
  }, [isMobile]);

  const cropRegions = useMemo(
    () =>
      state.mode === "split"
        ? computeSplitRegions(state.project.canvas.width, state.project.canvas.height, splitOptions)
        : null,
    [state.mode, state.project.canvas.width, state.project.canvas.height, splitOptions],
  );

  /** Guide cut lines (canvas px) rendered in split mode when using custom guides. */
  const splitGuideLines = useMemo(() => {
    if (state.mode !== "split" || splitOptions.evenly) return { x: [], y: [] };
    return {
      x: normalizeGuides(splitOptions.guideX ?? [], state.project.canvas.width),
      y: normalizeGuides(splitOptions.guideY ?? [], state.project.canvas.height),
    };
  }, [state.mode, splitOptions, state.project.canvas.width, state.project.canvas.height]);

  /** Dragging a guide line on the canvas updates its cut position. */
  const handleSplitGuideDrag = useCallback(
    (axis: "x" | "y", index: number, position: number) => {
      setSplitOptions((o) => {
        if (axis === "x") {
          const guides = [...(o.guideX ?? [])];
          if (index >= guides.length) return o;
          guides[index] = position;
          return { ...o, guideX: guides };
        }
        const guides = [...(o.guideY ?? [])];
        if (index >= guides.length) return o;
        guides[index] = position;
        return { ...o, guideY: guides };
      });
    },
    [],
  );

  /* ── Background removal ───────────────────────────────── */

  const removeBackgroundFor = useCallback(async () => {
    const target = (state.project.layers.find(
      (l) => l.id === state.selectedLayerId && l.type === "image",
    ) as ImageLayer | undefined) ?? (state.project.layers.find((l) => l.type === "image") as ImageLayer | undefined);
    if (!target) return;
    const doc = registry.get(target.docId);
    if (!doc) {
      setBgError("The image is no longer available.");
      return;
    }
    setBgBusy(true);
    setBgError(null);
    setBgProgress(5);
    setBgStatus("Preparing…");
    try {
      const bitmap = await removeBackground(
        doc.get() as ImageBitmap,
        undefined,
        (pct, label) => {
          setBgProgress(pct);
          if (label) setBgStatus(label);
        },
      );
      const newDoc = {
        id: `${doc.id}-nobg-${Math.random().toString(36).slice(2, 6)}`,
        name: doc.name,
        width: bitmap.width,
        height: bitmap.height,
        type: doc.type,
        size: doc.size,
        get: () => bitmap,
        release: () => bitmap.close(),
      };
      registry.add(newDoc);
      dispatch({
        type: "update-layer",
        id: target.id,
        patch: { docId: newDoc.id },
      });
      toast.success("Background removed", { description: "Background pixels are now transparent." });
    } catch (err) {
      setBgError(friendlyError(err, "Background removal failed."));
    } finally {
      setBgBusy(false);
      setBgProgress(0);
      setBgStatus("");
    }
  }, [state.project.layers, state.selectedLayerId, registry]);

  /* ── Merge / split / collage ─────────────────────────── */

  /** Docs in the effective merge order (custom order, then new imports). */
  const mergeDocs = useMemo(() => {
    if (!mergeOrder) return docs;
    const ordered = [
      ...mergeOrder
        .map((id) => docs.find((d) => d.id === id))
        .filter((d): d is (typeof docs)[number] => !!d),
      ...docs.filter((d) => !mergeOrder.includes(d.id)),
    ];
    return ordered;
  }, [docs, mergeOrder]);

  const runMerge = useCallback(async () => {
    if (mergeDocs.length < 2) return;
    setMergeBusy(true);
    try {
      const result = await exportMerge(
        mergeDocs.map((d) => ({ docId: d.id })),
        registry,
        mergeOptions,
        { format: "png", quality: 92, scale: 1, filename: "merged" },
      );
      setExportResult(result);
      setExportOpen(true);
    } catch (err) {
      toast.error(friendlyError(err, "Merge failed."));
    } finally {
      setMergeBusy(false);
    }
  }, [mergeDocs, registry, mergeOptions]);

  /** Load the merge layout as a new editable project (layers kept intact). */
  const openMergeInEditor = useCallback(() => {
    if (mergeDocs.length < 2) return;
    try {
      const project = buildMergeProject(
        mergeDocs.map((d) => ({ docId: d.id })),
        registry,
        mergeOptions,
      );
      dispatch({ type: "load-project", project });
      dispatch({ type: "set-mode", mode: "select" });
      setExportResult(null);
      setExportOpen(false);
      toast.success("Merged layout opened in the editor", {
        description: "Each image is a movable layer on the new canvas.",
      });
    } catch (err) {
      toast.error(friendlyError(err, "Could not open the merge layout."));
    }
  }, [mergeDocs, registry, mergeOptions]);

  const runSplitExport = useCallback(async () => {
    setSplitBusy(true);
    try {
      const result = await exportSplit(state.project, registry, splitOptions, {
        format: "png",
        quality: 92,
        scale: 1,
        filename: "split",
      });
      // Many files → one ZIP download instead of a download storm.
      if (result.files.length > 3) {
        try {
          const zip = await zipExportFiles(result.files);
          setExportResult({
            ...result,
            files: [{ filename: "split.zip", blob: zip }],
          });
        } catch (err) {
          toast.error(friendlyError(err, "ZIP packaging failed — downloading files individually."));
          setExportResult(result);
        }
      } else {
        setExportResult(result);
      }
      setExportOpen(true);
    } catch (err) {
      toast.error(friendlyError(err, "Split failed."));
    } finally {
      setSplitBusy(false);
    }
  }, [state.project, registry, splitOptions]);

  // Enter collage mode lazily: init collage state on first switch.
  const enterCollage = useCallback(() => {
    const templateId: CollageTemplateId = "grid-4";
    if (!state.collage) {
      const slots: CollageState["slots"] = Array.from(
        { length: COLLAGE_SLOT_COUNTS[templateId] },
        () => ({ docId: null, zoom: 1, offsetX: 0, offsetY: 0, opacity: 1 }),
      );
      // Auto-fill from imported docs.
      docs.slice(0, slots.length).forEach((doc, i) => {
        slots[i].docId = doc.id;
      });
      dispatch({ type: "init-collage", slots, templateId });
    }
    dispatch({ type: "set-mode", mode: "collage" });
  }, [state.collage, docs]);

  const runCollageExport = useCallback(async () => {
    if (!state.collage) return;
    setCollageBusy(true);
    try {
      const canvas = state.project.canvas;
      const result = await exportCollage(
        state.collage.slots,
        state.collage.templateId,
        {
          spacing: state.collage.spacing,
          padding: state.collage.padding,
          background: state.collage.background,
          cellRadius: state.collage.cellRadius,
        },
        canvas.width,
        canvas.height,
        registry,
        { format: "png", quality: 92, scale: 1, filename: "collage" },
      );
      setExportResult(result);
      setExportOpen(true);
    } catch (err) {
      toast.error(friendlyError(err, "Collage failed."));
    } finally {
      setCollageBusy(false);
    }
  }, [state.collage, state.project.canvas, registry]);

  /* ── Export ────────────────────────────────────────────── */

  const runExport = useCallback(
    async (config: { format: ExportFormat; quality: number; scale: number; filename: string }) => {
      setExportBusy(true);
      try {
        const result = await exportProject(state.project, registry, config);
        setExportResult(result);
      } catch (err) {
        toast.error(friendlyError(err, "Export failed."));
      } finally {
        setExportBusy(false);
      }
    },
    [state.project, registry],
  );

  /* ── Keyboard shortcuts ───────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: "redo" });
        else dispatch({ type: "undo" });
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement;
        if (t.closest("input, textarea, select")) return;
        if (state.selectedLayerId) {
          e.preventDefault();
          dispatch({ type: "remove-layer", id: state.selectedLayerId });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedLayerId]);

  /* ── Layout ───────────────────────────────────────────── */

  // The editor shell is usable with any layer — image, text, or shape
  // (text-only designs). Toolbar modes that need images are gated there.
  const hasImages = state.project.layers.some((l) => l.type === "image");
  const hasLayers = state.project.layers.length > 0;
  const canExport = hasLayers;

  const renderModePanel = () => {
    switch (state.mode) {
      case "merge":
        return (
          <MergePanel
            docs={docs}
            order={mergeOrder}
            onOrderChange={setMergeOrder}
            options={mergeOptions}
            onOptionsChange={(patch) => setMergeOptions((o) => ({ ...o, ...patch }))}
            onMerge={runMerge}
            onOpenInEditor={openMergeInEditor}
            busy={mergeBusy}
          />
        );
      case "split":
        return (
          <SplitPanel
            options={splitOptions}
            onOptionsChange={(patch) => setSplitOptions((o) => ({ ...o, ...patch }))}
            onExportSplit={runSplitExport}
            busy={splitBusy}
            canvasWidth={state.project.canvas.width}
            canvasHeight={state.project.canvas.height}
          />
        );
      case "collage":
        return (
          <CollagePanel
            state={state}
            dispatch={dispatch}
            docs={docs}
            onExportCollage={runCollageExport}
            busy={collageBusy}
            onAddDocToSlot={(docId, slotIndex) =>
              dispatch({ type: "set-collage-slot", index: slotIndex, patch: { docId } })
            }
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        );
      case "background-removal":
        return (
          <BackgroundRemovalPanel
            capability={bgCapability}
            onRemove={removeBackgroundFor}
            busy={bgBusy}
            progress={bgProgress}
            status={bgStatus}
            error={bgError}
            disabledReason={hasImages ? null : "Import an image first."}
          />
        );
      default:
        return (
          <PropertiesPanel
            state={state}
            dispatch={dispatch}
            onCropApply={applyCrop}
            cropAspect={cropAspect}
            onCropAspectChange={setCropAspect}
            cropReady={
              !!cropDraft &&
              cropDraft.width >= 4 &&
              cropDraft.height >= 4 &&
              !cropTargetRotated
            }
            cropBlockedReason={
              cropTargetRotated
                ? "The selected image is rotated to a non-axis angle. Set its rotation to a multiple of 90° (Select mode → Rotation) before cropping."
                : null
            }
            straighten={straighten}
            onStraightenChange={handleStraighten}
            focusTextLayerId={textFocusId}
            onTextFocused={() => setTextFocusId(null)}
          />
        );
    }
  };

  const modeTitle = MODE_TITLES[state.mode] ?? "Properties";

  return (
    <ToolContainer>
      {/* Import / empty state */}
      {!hasLayers ? (
        <div className="flex flex-col gap-4" data-testid="editor-import-state">
          <UploadZone
            accept="image/*"
            multiple
            maxFiles={MAX_IMPORT_FILES}
            maxFileSizeMB={MAX_IMPORT_MB}
            files={stagedFiles}
            onFilesChange={handleImportFiles}
            label="Drop images here, paste, or click to browse"
            hint={`Up to ${MAX_IMPORT_FILES} images · PNG, JPG, WebP, GIF, AVIF · max ${MAX_IMPORT_MB} MB each · files stay on your device`}
          />
          {importError && (
            <Alert variant="destructive">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
          {importNotices.length > 0 && (
            <Alert>
              <AlertDescription>
                {importNotices.join(" ")}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-center text-sm text-muted-foreground">
            One image starts the editor — or start with text and shapes for
            text-only designs. Import more later for merge, split and collage
            workflows — everything happens in your browser.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              data-testid="start-text-design"
              onClick={() => {
                // Seed a text layer on a default canvas so the editor shell
                // opens with the Text panel ready (text-only design entry).
                const layer = makeTextLayer(1024, 1024);
                dispatch({
                  type: "load-project",
                  project: {
                    canvas: {
                      width: 1024,
                      height: 1024,
                      background: "transparent",
                      borderRadius: 0,
                      padding: 0,
                      border: { style: "none", color: "#ffffff", width: 0 },
                      aspectPreset: "original",
                    },
                    layers: [layer],
                  },
                });
                dispatch({ type: "select-layer", id: layer.id });
                dispatch({ type: "set-mode", mode: "text" });
                setTextFocusId(layer.id);
              }}
            >
              <Type data-icon="inline-start" />
              Start a text design
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2" data-testid="editor-main">
          <div className="flex flex-col overflow-hidden rounded-xl border bg-card md:flex-row md:h-[70vh] md:min-h-[520px]">
            {/* Toolbar (left rail on desktop) */}
            <div className="order-2 border-t bg-card px-2 py-1.5 md:order-1 md:h-full md:w-14 md:border-t-0 md:border-r md:py-2">
              <EditorToolbar
                mode={state.mode}
                onModeChange={(m) => {
                  if (m === "collage") enterCollage();
                  else dispatch({ type: "set-mode", mode: m });
                  if (m !== "crop") setCropDraft(null);
                  if (isMobile) setPanelSheet(true);
                }}
                onImport={() => setImportSheetOpen(true)}
                hasImages={hasImages}
              />
            </div>

            {/* Center column: header + canvas + footer */}
            <div className="order-1 flex min-w-0 flex-1 flex-col md:order-2">
              <EditorHeader
                state={state}
                onUndo={() => dispatch({ type: "undo" })}
                onRedo={() => dispatch({ type: "redo" })}
                onReset={() => dispatch({ type: "reset" })}
                onZoom={(z) => dispatch({ type: "set-zoom", zoom: z })}
                onFit={() => dispatch({ type: "set-fit-zoom", fit: true })}
                onExport={() => {
                  setExportResult(null);
                  setExportOpen(true);
                }}
                canExport={canExport}
              />
              <div className="relative min-h-0 flex-1 p-2">
                {state.mode === "collage" && state.collage ? (
                  <CollagePreview state={state} registry={registry} />
                ) : (
                  <EditorCanvas
                    state={state}
                    registry={registry}
                    dispatch={dispatch}
                    cropDraft={state.mode === "crop" ? cropDraft : null}
                    onCropDraftChange={setCropDraft}
                    textMeasures={textMeasures}
                    splitRegions={cropRegions ?? []}
                    splitGuides={
                      splitGuideLines.x.length + splitGuideLines.y.length > 0
                        ? splitGuideLines
                        : null
                    }
                    onSplitGuideDrag={handleSplitGuideDrag}
                    cropAspectValue={
                      cropAspect === "free" || cropAspect === "original"
                        ? null
                        : Number(cropAspect.split(":")[0]) / Number(cropAspect.split(":")[1])
                    }
                    onRequestTextFocus={handleRequestTextFocus}
                  />
                )}
              </div>
              {/* Status footer */}
              <div className="flex items-center justify-between gap-2 border-t px-3 py-1.5 text-xs text-muted-foreground">
                <span data-testid="editor-canvas-size">
                  {state.project.canvas.width} × {state.project.canvas.height} px
                </span>
                <span
                  className="hidden sm:block"
                  title={docs.map((d) => d.name).join(", ")}
                >
                  {docs.length} image{docs.length === 1 ? "" : "s"} imported
                </span>
                <span className="hidden sm:block">
                  {state.history.past.length} edit{state.history.past.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Right panel: 3-panel at lg+, sheet at md (tablet). */}
            <div className="order-3 hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-card p-3 lg:flex">
              <div className="flex flex-col gap-4">
                {renderModePanel()}
                <div className="h-px bg-border" aria-hidden />
                <LayersPanel state={state} dispatch={dispatch} />
              </div>
            </div>
          </div>

          {/* Mobile / tablet panel trigger */}
          {(isMobile || isTablet) && (
            <Button
              variant="outline"
              onClick={() => {
                if (isMobile) setPanelSheet(true);
                else setTabletPanelOpen(true);
              }}
              className="lg:hidden"
              data-testid="open-panels"
            >
              {modeTitle} & layers
            </Button>
          )}
        </div>
      )}

      {/* Mobile properties sheet */}
      <Sheet open={panelSheet && isMobile} onOpenChange={setPanelSheet}>
        <SheetContent side="bottom" className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{modeTitle}</SheetTitle>
          </SheetHeader>
          {renderModePanel()}
          <div className="h-px bg-border" aria-hidden />
          <LayersPanel state={state} dispatch={dispatch} />
        </SheetContent>
      </Sheet>

      {/* Tablet properties sheet (md–lg: 2-panel + sheet) */}
      <Sheet open={tabletPanelOpen && isTablet} onOpenChange={setTabletPanelOpen}>
        <SheetContent side="right" className="flex w-80 flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{modeTitle}</SheetTitle>
          </SheetHeader>
          {renderModePanel()}
          <div className="h-px bg-border" aria-hidden />
          <LayersPanel state={state} dispatch={dispatch} />
        </SheetContent>
      </Sheet>

      {/* Import sheet (adding more images) */}
      <Sheet
        open={importSheetOpen}
        onOpenChange={(open) => {
          setImportSheetOpen(open);
          if (!open) setStagedFiles([]);
        }}
      >
        <SheetContent side={isMobile ? "bottom" : "right"} className="flex flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import images</SheetTitle>
          </SheetHeader>
          <UploadZone
            accept="image/*"
            multiple
            maxFiles={MAX_IMPORT_FILES}
            maxFileSizeMB={MAX_IMPORT_MB}
            files={stagedFiles}
            onFilesChange={handleImportFiles}
            label="Drop images here or click to browse"
            hint={`Adds to the current editor · max ${MAX_IMPORT_MB} MB each`}
          />
        </SheetContent>
      </Sheet>

      <ExportDialog
        key={`export-${exportOpen ? "open" : "closed"}`}
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) setExportResult(null);
        }}
        canvasWidth={state.project.canvas.width}
        canvasHeight={state.project.canvas.height}
        transparentBackground={state.project.canvas.background === "transparent"}
        onExport={runExport}
        busy={exportBusy}
        result={exportResult}
        onDone={() => setExportResult(null)}
        initialFilename="edited-image"
      />
    </ToolContainer>
  );
}

const MODE_TITLES: Record<string, string> = {
  select: "Select & transform",
  crop: "Crop",
  adjust: "Adjustments",
  filters: "Filters",
  text: "Text",
  elements: "Elements",
  canvas: "Canvas",
  "background-removal": "Background removal",
  merge: "Merge images",
  split: "Split image",
  collage: "Collage",
};

/* ── Collage live preview ──────────────────────────────── */

function CollagePreview({
  state,
  registry,
}: {
  state: EditorState;
  registry: BitmapRegistry;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const rafRef = useRef(0);

  // Track the preview box size (ResizeObserver is client-only).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setViewport({ width: box.width, height: box.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const collage = state.collage;
  const canvas = state.project.canvas;

  // Draw the collage directly (no blob pipeline): build project → render
  // at preview scale → release scratch bitmaps. rAF-batched so slider
  // ticks coalesce into one frame.
  useEffect(() => {
    if (!collage) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const cnv = canvasRef.current;
      if (!cnv) return;
      const pad = 32;
      const fitScale = Math.min(
        (viewport.width - pad) / canvas.width,
        (viewport.height - pad) / canvas.height,
        1,
      );
      const scale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 0.1;
      const cw = Math.max(1, Math.round(canvas.width * scale));
      const ch = Math.max(1, Math.round(canvas.height * scale));
      cnv.width = cw;
      cnv.height = ch;
      cnv.style.width = `${cw}px`;
      cnv.style.height = `${ch}px`;
      const ctx = cnv.getContext("2d");
      if (!ctx) return;
      let scratch: ScratchBitmap[] = [];
      try {
        const built = buildCollageProject(
          collage.slots,
          collage.templateId,
          {
            spacing: collage.spacing,
            padding: collage.padding,
            background: collage.background,
            cellRadius: collage.cellRadius,
          },
          canvas.width,
          canvas.height,
          registry,
        );
        scratch = built.scratch;
        renderCollageProject(ctx, built.project, registry, built.subs, { scale });
      } catch {
        // Skip the frame (e.g. a released bitmap); next tick retries.
      } finally {
        releaseScratchBitmaps(scratch);
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [collage, canvas.width, canvas.height, registry, viewport.width, viewport.height]);

  return (
    <div
      ref={wrapRef}
      className="flex h-full min-h-0 items-center justify-center overflow-auto"
      data-testid="collage-preview"
    >
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full"
        aria-label="Collage preview. Configure slots in the panel."
      />
    </div>
  );
}
