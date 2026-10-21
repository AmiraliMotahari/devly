"use client";

/**
 * Multi-image workflow panels: merge, split, collage + background removal.
 */

import { Grid2x2, Rows3, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "cn";
import type { EditorAction, EditorState } from "./state";
import type {
  MergeOptions,
  SplitOptions,
} from "../types/editor";
import { COLLAGE_TEMPLATES } from "../types/editor";
import { splitRegionCount, nextGuidePosition } from "../processing/geometry";

/* ── Merge panel ────────────────────────────────────────── */

export function MergePanel({
  docs,
  order,
  onOrderChange,
  options,
  onOptionsChange,
  onMerge,
  onOpenInEditor,
  busy,
}: {
  docs: { id: string; name: string; width: number; height: number }[];
  /** Merge order as docIds; defaults to import order when null. */
  order: string[] | null;
  onOrderChange: (order: string[] | null) => void;
  options: MergeOptions;
  onOptionsChange: (patch: Partial<MergeOptions>) => void;
  onMerge: () => void;
  /** Load the merge result back into the editor as an editable project. */
  onOpenInEditor: () => void;
  busy: boolean;
}) {
  if (docs.length < 2) {
    return (
      <Section title="Merge images">
        <p className="text-sm text-muted-foreground">
          Import at least two images to merge them into one. New images can
          be added from the Import button.
        </p>
      </Section>
    );
  }
  // Resolve the effective order: stored order first, then any docs added
  // since (imports keep working without resetting the custom order).
  const ordered = order
    ? [
        ...order
          .map((id) => docs.find((d) => d.id === id))
          .filter((d): d is (typeof docs)[number] => !!d),
        ...docs.filter((d) => !order.includes(d.id)),
      ]
    : docs;
  const moveDoc = (index: number, delta: -1 | 1) => {
    const ids = ordered.map((d) => d.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onOrderChange(ids);
  };
  return (
    <Section title="Merge images">
      <p className="text-sm text-muted-foreground">
        Combine the imported images ({docs.length}) into a single image.
        Each image keeps its aspect ratio.
      </p>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Order</Label>
        <ul className="flex flex-col gap-1" aria-label="Merge order">
          {ordered.map((doc, i) => (
            <li key={doc.id} className="flex items-center gap-1">
              <span className="w-4 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{doc.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                onClick={() => moveDoc(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${doc.name} earlier`}
              >
                <span aria-hidden>↑</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5"
                onClick={() => moveDoc(i, 1)}
                disabled={i === ordered.length - 1}
                aria-label={`Move ${doc.name} later`}
              >
                <span aria-hidden>↓</span>
              </Button>
            </li>
          ))}
        </ul>
        {order && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start h-6 px-2 text-xs"
            onClick={() => onOrderChange(null)}
          >
            Reset to import order
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Layout</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Merge layout">
          {(
            [
              ["vertical", "Vertical"],
              ["horizontal", "Horizontal"],
              ["grid", "Grid"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant={options.layout === id ? "secondary" : "outline"}
              size="sm"
              onClick={() => onOptionsChange({ layout: id })}
              aria-pressed={options.layout === id}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <SliderField
        label="Spacing"
        value={options.spacing}
        min={0}
        max={100}
        unit="px"
        onValueChange={(v) => onOptionsChange({ spacing: v })}
      />
      <SliderField
        label="Padding"
        value={options.padding}
        min={0}
        max={100}
        unit="px"
        onValueChange={(v) => onOptionsChange({ padding: v })}
      />
      {options.layout !== "grid" && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Alignment</Label>
          <div className="flex gap-2" role="group" aria-label="Alignment">
            {(["start", "center", "end"] as const).map((a) => (
              <Button
                key={a}
                variant={options.align === a ? "secondary" : "outline"}
                size="sm"
                onClick={() => onOptionsChange({ align: a })}
                aria-pressed={options.align === a}
              >
                {a === "start" ? "Start" : a === "center" ? "Center" : "End"}
              </Button>
            ))}
          </div>
        </div>
      )}
      {options.layout === "grid" && (
        <SliderField
          label="Columns"
          value={options.columns}
          min={1}
          max={Math.min(6, docs.length)}
          onValueChange={(v) => onOptionsChange({ columns: Math.round(v) })}
        />
      )}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Background color</Label>
        <input
          type="color"
          value={options.background === "transparent" ? "#ffffff" : options.background}
          onChange={(e) => onOptionsChange({ background: e.target.value })}
          className="size-7 cursor-pointer rounded-md border bg-background p-0.5"
          aria-label="Merge background color"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={onMerge} disabled={busy} data-testid="merge-images">
          {busy ? "Merging…" : `Merge ${docs.length} images`}
        </Button>
        <Button variant="outline" onClick={onOpenInEditor} disabled={busy} data-testid="merge-open-editor">
          Open in editor
        </Button>
      </div>
    </Section>
  );
}

/* ── Split panel ────────────────────────────────────────── */

export function SplitPanel({
  options,
  onOptionsChange,
  onExportSplit,
  busy,
  canvasWidth,
  canvasHeight,
}: {
  options: SplitOptions;
  onOptionsChange: (patch: Partial<SplitOptions>) => void;
  onExportSplit: () => void;
  busy: boolean;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const count = splitRegionCount(options, canvasWidth, canvasHeight);
  return (
    <Section title="Split image">
      <p className="text-sm text-muted-foreground">
        Cut the current canvas into {count} region{count === 1 ? "" : "s"}.
        Regions preview on the canvas; export delivers one file per region.
      </p>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Mode</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Split mode">
          {(
            [
              ["rows", "Rows"],
              ["columns", "Columns"],
              ["grid", "Grid"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant={options.mode === id ? "secondary" : "outline"}
              size="sm"
              onClick={() => onOptionsChange({ mode: id })}
              aria-pressed={options.mode === id}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {options.evenly ? (
        <>
          <SliderField
            label="Rows"
            value={options.rows}
            min={1}
            max={10}
            onValueChange={(v) => onOptionsChange({ rows: Math.round(v) })}
          />
          <SliderField
            label="Columns"
            value={options.columns}
            min={1}
            max={10}
            onValueChange={(v) => onOptionsChange({ columns: Math.round(v) })}
          />
        </>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border p-3" data-testid="split-guides">
          <p className="text-xs text-muted-foreground">
            Custom guides: drag the dashed lines on the canvas to set cut
            positions. {options.guideX?.length ?? 0} vertical ·{" "}
            {options.guideY?.length ?? 0} horizontal cut
            {(options.guideX?.length ?? 0) + (options.guideY?.length ?? 0) === 1 ? "" : "s"}.
          </p>
          <div className="flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onOptionsChange({
                  guideX: [
                    ...(options.guideX ?? []),
                    nextGuidePosition(options.guideX ?? [], canvasWidth),
                  ],
                })
              }
              data-testid="add-guide-x"
            >
              <Columns3 data-icon="inline-start" />
              Add vertical cut
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onOptionsChange({
                  guideY: [
                    ...(options.guideY ?? []),
                    nextGuidePosition(options.guideY ?? [], canvasHeight),
                  ],
                })
              }
              data-testid="add-guide-y"
            >
              <Rows3 data-icon="inline-start" />
              Add horizontal cut
            </Button>
          </div>
          {((options.guideX?.length ?? 0) + (options.guideY?.length ?? 0)) > 0 && (
            <ul className="flex flex-col gap-1" aria-label="Guide cut positions">
              {(options.guideX ?? []).map((px, i) => (
                <li key={`gx-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums">vertical cut {i + 1}: {Math.round(px)}px</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() =>
                      onOptionsChange({ guideX: (options.guideX ?? []).filter((_, j) => j !== i) })
                    }
                    aria-label={`Remove vertical cut ${i + 1}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
              {(options.guideY ?? []).map((px, i) => (
                <li key={`gy-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums">horizontal cut {i + 1}: {Math.round(px)}px</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() =>
                      onOptionsChange({ guideY: (options.guideY ?? []).filter((_, j) => j !== i) })
                    }
                    aria-label={`Remove horizontal cut ${i + 1}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="split-evenly" className="text-xs">Even regions</Label>
        <Switch
          id="split-evenly"
          checked={options.evenly}
          onCheckedChange={(v) =>
            onOptionsChange(
              v
                ? { evenly: true }
                : {
                    evenly: false,
                    // Seed one cut per axis at the widest gap (midpoint
                    // for an empty canvas) so the canvas shows a start point.
                    guideX: [nextGuidePosition([], canvasWidth)],
                    guideY: [nextGuidePosition([], canvasHeight)],
                  },
            )
          }
        />
      </div>
      <Button onClick={onExportSplit} disabled={busy} data-testid="export-split">
        {busy ? "Exporting…" : `Export ${count} file${count === 1 ? "" : "s"}`}
      </Button>
    </Section>
  );
}

/* ── Collage panel ──────────────────────────────────────── */

export function CollagePanel({
  state,
  dispatch,
  docs,
  onExportCollage,
  busy,
  onAddDocToSlot,
  selectedSlot,
  onSelectSlot,
}: {
  state: EditorState;
  dispatch: (a: EditorAction) => void;
  docs: { id: string; name: string }[];
  onExportCollage: () => void;
  busy: boolean;
  onAddDocToSlot: (docId: string, slotIndex: number) => void;
  selectedSlot: number | null;
  onSelectSlot: (i: number | null) => void;
}) {
  const collage = state.collage;
  if (!collage) return null;
  const template = COLLAGE_TEMPLATES.find((t) => t.id === collage.templateId)!;

  return (
    <>
      <Section title="Collage template">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Collage templates">
          {COLLAGE_TEMPLATES.map((t) => (
            <Button
              key={t.id}
              variant={collage.templateId === t.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => dispatch({ type: "set-collage-template", id: t.id })}
              aria-pressed={collage.templateId === t.id}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </Section>
      <Section title="Slots">
        <p className="text-xs text-muted-foreground">
          {template.slots} slots. Click a slot, then pick an image; or click
          an image to fill the first empty slot.
        </p>
        <ul className="flex flex-col gap-1.5">
          {collage.slots.map((slot, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                selectedSlot === i ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <button
                type="button"
                className="flex-1 text-left text-xs font-medium"
                onClick={() => onSelectSlot(selectedSlot === i ? null : i)}
                aria-pressed={selectedSlot === i}
              >
                Slot {i + 1}
                <span className="ml-2 text-muted-foreground">
                  {slot.docId
                    ? docs.find((d) => d.id === slot.docId)?.name ?? "image"
                    : "empty"}
                </span>
              </button>
              {slot.docId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => dispatch({ type: "set-collage-slot", index: i, patch: { docId: null, zoom: 1, offsetX: 0, offsetY: 0 } })}
                  aria-label={`Clear slot ${i + 1}`}
                >
                  Clear
                </Button>
              )}
              {i > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => dispatch({ type: "swap-collage-slots", a: i, b: i - 1 })}
                  aria-label={`Swap slot ${i + 1} with slot ${i}`}
                >
                  <span aria-hidden>⇄</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
        {docs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Fill from library</Label>
            <div className="flex flex-wrap gap-1.5">
              {docs.slice(0, 12).map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    const target = selectedSlot ?? collage.slots.findIndex((s) => !s.docId);
                    if (target >= 0) {
                      onAddDocToSlot(doc.id, target);
                      onSelectSlot(null);
                    }
                  }}
                  className="max-w-32 truncate rounded-md border px-2 py-1 text-[11px] hover:bg-accent"
                >
                  {doc.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>
      <Section title="Collage style">
        <SliderField
          label="Spacing"
          value={collage.spacing}
          min={0}
          max={60}
          unit="px"
          onValueChange={(v) => dispatch({ type: "set-collage", patch: { spacing: Math.round(v) } })}
        />
        <SliderField
          label="Padding"
          value={collage.padding}
          min={0}
          max={80}
          unit="px"
          onValueChange={(v) => dispatch({ type: "set-collage", patch: { padding: Math.round(v) } })}
        />
        <SliderField
          label="Corner radius"
          value={collage.cellRadius}
          min={0}
          max={80}
          unit="px"
          onValueChange={(v) => dispatch({ type: "set-collage", patch: { cellRadius: Math.round(v) } })}
        />
        <div className="flex items-center justify-between">
          <Label className="text-xs">Background</Label>
          <input
            type="color"
            value={collage.background === "transparent" ? "#ffffff" : collage.background}
            onChange={(e) => dispatch({ type: "set-collage", patch: { background: e.target.value } })}
            className="size-7 cursor-pointer rounded-md border bg-background p-0.5"
            aria-label="Collage background color"
          />
        </div>
      </Section>
      {selectedSlot !== null && collage.slots[selectedSlot]?.docId && (
        <Section title={`Slot ${selectedSlot + 1} — crop/zoom`}>
          <SliderField
            label="Zoom"
            value={collage.slots[selectedSlot].zoom}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) =>
              dispatch({ type: "set-collage-slot", index: selectedSlot, patch: { zoom: v } })
            }
          />
          <SliderField
            label="Pan X"
            value={collage.slots[selectedSlot].offsetX}
            min={-1}
            max={1}
            step={0.05}
            onValueChange={(v) =>
              dispatch({ type: "set-collage-slot", index: selectedSlot, patch: { offsetX: v } })
            }
          />
          <SliderField
            label="Pan Y"
            value={collage.slots[selectedSlot].offsetY}
            min={-1}
            max={1}
            step={0.05}
            onValueChange={(v) =>
              dispatch({ type: "set-collage-slot", index: selectedSlot, patch: { offsetY: v } })
            }
          />
        </Section>
      )}
      <Button onClick={onExportCollage} disabled={busy} data-testid="export-collage">
        {busy ? "Rendering…" : "Export collage"}
      </Button>
    </>
  );
}

/* ── Background removal panel ───────────────────────────── */

export function BackgroundRemovalPanel({
  capability,
  onRemove,
  busy,
  progress,
  status,
  error,
  disabledReason,
}: {
  capability: { available: boolean; reason?: string };
  onRemove: () => void;
  busy: boolean;
  progress: number;
  status: string;
  error: string | null;
  disabledReason: string | null;
}) {
  return (
    <Section title="Background removal">
      <p className="text-sm text-muted-foreground">
        Removes a solid or near-solid background color (chroma-key style) by
        scanning edge colors — runs entirely in your browser, no model
        download. Works best on flat backgrounds (product shots, logos).
      </p>
      {!capability.available && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          {capability.reason ??
            "Background removal is unavailable in this browser."}
        </p>
      )}
      {disabledReason && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
      {busy && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        onClick={onRemove}
        disabled={busy || !capability.available || !!disabledReason}
        data-testid="remove-background"
      >
        {busy ? "Removing…" : "Remove background"}
      </Button>
    </Section>
  );
}

/* ── shared bits ────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onValueChange: (v: number) => void;
}) {
  const id = `slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {Math.round(value * 100) / 100}
          {unit ?? ""}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onValueChange(v)}
        aria-label={label}
        data-testid={`slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      />
    </div>
  );
}

export const MultiImageIcons = { Grid2x2, Rows3, Columns3 };
