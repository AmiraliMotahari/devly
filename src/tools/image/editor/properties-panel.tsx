"use client";

/**
 * Right-side properties panel. Renders controls contextual to the active
 * mode and selected layer. Slider drags dispatch transient updates
 * (single history entry per drag).
 */

import { FlipHorizontal, FlipVertical, Trash2, Copy, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import type { EditorAction, EditorState } from "./state";
import type {
  ImageAdjustments,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  EditorLayer,
  AspectPresetId,
  BorderStyle,
} from "../types/editor";
import { FILTER_PRESETS, NEUTRAL_ADJUSTMENTS } from "../types/editor";
import { composeAdjustments, ASPECT_VALUES } from "../processing/geometry";

/* ── Shared bits ────────────────────────────────────────── */

function PanelSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4", className)} aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function PropSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  unit,
  defaultValue,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit: () => void;
  unit?: string;
  defaultValue?: number;
  disabled?: boolean;
}) {
  const id = `prop-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-xs">{label}</Label>
        <div className="flex items-center gap-1.5">
          {defaultValue !== undefined && value !== defaultValue && (
            <button
              type="button"
              onClick={() => { onChange(defaultValue); onCommit(); }}
              className="text-[10px] text-muted-foreground hover:text-foreground"
              aria-label={`Reset ${label}`}
            >
              reset
            </button>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(value)}{unit ?? ""}
          </span>
        </div>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={() => onCommit()}
        disabled={disabled}
        aria-label={label}
        data-testid={`slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowTransparent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
}) {
  const id = `color-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const isTransparent = value === "transparent";
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {allowTransparent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
            aria-pressed={isTransparent}
          >
            {isTransparent ? "Opaque" : "Transparent"}
          </Button>
        )}
        <input
          id={id}
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded-md border bg-background p-0.5"
          aria-label={`${label} color`}
        />
      </div>
    </div>
  );
}

/* ── Main panel ─────────────────────────────────────────── */

export function PropertiesPanel({
  state,
  dispatch,
  onCropApply,
  cropAspect,
  onCropAspectChange,
  cropReady,
  cropBlockedReason,
  straighten,
  onStraightenChange,
  focusTextLayerId,
  onTextFocused,
}: {
  state: EditorState;
  dispatch: (a: EditorAction) => void;
  onCropApply: () => void;
  cropAspect: string;
  onCropAspectChange: (v: string) => void;
  /** False when cropping is impossible (e.g. rotated target). */
  cropReady: boolean;
  /** Why cropping is blocked, shown to the user. */
  cropBlockedReason?: string | null;
  /** Current straighten angle (-15..15 degrees). */
  straighten: number;
  onStraightenChange: (value: number) => void;
  /** Layer id whose content input should receive focus (double-click). */
  focusTextLayerId?: string | null;
  onTextFocused?: () => void;
}) {
  const { mode, project } = state;
  const selected = project.layers.find((l) => l.id === state.selectedLayerId) ?? null;

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="properties-panel">
      {mode === "select" && <SelectPanel selected={selected} state={state} dispatch={dispatch} />}
      {mode === "adjust" && <AdjustPanel selected={selected} state={state} dispatch={dispatch} />}
      {mode === "filters" && <FilterPanel selected={selected} dispatch={dispatch} />}
      {mode === "crop" && (
        <CropPanel
          onApply={onCropApply}
          aspect={cropAspect}
          onAspectChange={onCropAspectChange}
          ready={cropReady}
          blockedReason={cropBlockedReason}
          straighten={straighten}
          onStraightenChange={onStraightenChange}
        />
      )}
      {mode === "text" && (
        <TextPanel
          selected={selected}
          state={state}
          dispatch={dispatch}
          focusLayerId={focusTextLayerId}
          onFocused={onTextFocused}
        />
      )}
      {mode === "elements" && <ElementsPanel selected={selected} state={state} dispatch={dispatch} />}
      {mode === "canvas" && <CanvasPanel state={state} dispatch={dispatch} />}
    </div>
  );
}

/* ── Select-mode: transform of the selected layer ────────── */

function SelectPanel({
  selected,
  state,
  dispatch,
}: {
  selected: EditorLayer | null;
  state: EditorState;
  dispatch: (a: EditorAction) => void;
}) {
  if (!selected) {
    return (
      <PanelSection title="Layer">
        <p className="text-sm text-muted-foreground">
          Select a layer on the canvas or in the Layers list to edit its
          properties. Drag on the canvas to move; use the handles to resize
          and rotate.
        </p>
      </PanelSection>
    );
  }
  const isImage = selected.type === "image";
  return (
    <>
      <PanelSection title={`${selected.name} — transform`}>
        <PropSlider
          label="X"
          value={Math.round(selected.x)}
          min={-Math.round(state.project.canvas.width)}
          max={Math.round(state.project.canvas.width * 2)}
          onChange={(v) => dispatch({ type: "update-layer", id: selected.id, patch: { x: v } })}
          onCommit={() => dispatch({ type: "commit" })}
        />
        <PropSlider
          label="Y"
          value={Math.round(selected.y)}
          min={-Math.round(state.project.canvas.height)}
          max={Math.round(state.project.canvas.height * 2)}
          onChange={(v) => dispatch({ type: "update-layer", id: selected.id, patch: { y: v } })}
          onCommit={() => dispatch({ type: "commit" })}
        />
        <PropSlider
          label="Rotation"
          value={Math.round(selected.rotation)}
          min={-180}
          max={180}
          onChange={(v) => dispatch({ type: "update-layer", id: selected.id, patch: { rotation: v } })}
          onCommit={() => dispatch({ type: "commit" })}
          unit="°"
          defaultValue={0}
        />
        <PropSlider
          label="Opacity"
          value={Math.round(selected.opacity * 100)}
          min={0}
          max={100}
          onChange={(v) => dispatch({ type: "update-layer", id: selected.id, patch: { opacity: v / 100 } })}
          onCommit={() => dispatch({ type: "commit" })}
          unit="%"
          defaultValue={100}
        />
        {isImage && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({ type: "update-layer", id: selected.id, patch: { flipX: !(selected as ImageLayer).flipX } })
              }
              aria-pressed={(selected as ImageLayer).flipX}
            >
              <FlipHorizontal data-icon="inline-start" />
              Flip H
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                dispatch({ type: "update-layer", id: selected.id, patch: { flipY: !(selected as ImageLayer).flipY } })
              }
              aria-pressed={(selected as ImageLayer).flipY}
            >
              <FlipVertical data-icon="inline-start" />
              Flip V
            </Button>
          </div>
        )}
      </PanelSection>
    </>
  );
}

/* ── Adjust ─────────────────────────────────────────────── */

const ADJUSTMENTS: { key: keyof ImageAdjustments; label: string; min?: number; max?: number; unit?: string }[] = [
  { key: "brightness", label: "Brightness" },
  { key: "contrast", label: "Contrast" },
  { key: "saturation", label: "Saturation" },
  { key: "exposure", label: "Exposure" },
  { key: "temperature", label: "Temperature" },
  { key: "tint", label: "Tint" },
  { key: "highlights", label: "Highlights" },
  { key: "shadows", label: "Shadows" },
  { key: "sharpness", label: "Sharpness", min: 0 },
  { key: "blur", label: "Blur", min: 0 },
  { key: "grayscale", label: "Grayscale", min: 0 },
];

function AdjustPanel({
  selected,
  state,
  dispatch,
}: {
  selected: EditorLayer | null;
  state: EditorState;
  dispatch: (a: EditorAction) => void;
}) {
  const image = selected?.type === "image" ? selected : null;
  if (!image) {
    return (
      <PanelSection title="Adjustments">
        <p className="text-sm text-muted-foreground">
          Select an image layer to adjust it. {state.project.layers.length === 0
            ? "Import an image first."
            : "Click an image on the canvas or pick it in the Layers list."}
        </p>
      </PanelSection>
    );
  }
  const composed = composeAdjustments(image.adjustments, image.filter, image.filterAmount);
  const manual = image.adjustments;
  return (
    <>
      <PanelSection title={`Adjust — ${image.name}`}>
        {ADJUSTMENTS.map(({ key, label, min, max, unit }) => (
          <PropSlider
            key={key}
            label={label}
            value={manual[key]}
            min={min ?? -100}
            max={max ?? 100}
            unit={unit}
            defaultValue={0}
            onChange={(v) =>
              dispatch({ type: "update-layer-adjustments", id: image.id, patch: { [key]: v }, transient: true })
            }
            onCommit={() => dispatch({ type: "commit" })}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            dispatch({
              type: "update-layer-adjustments",
              id: image.id,
              patch: { ...NEUTRAL_ADJUSTMENTS, opacity: manual.opacity },
            });
            dispatch({ type: "set-filter", id: image.id, filter: null });
          }}
        >
          Reset adjustments
        </Button>
      </PanelSection>
      <PanelSection title="Composed value (with filter)">
        <p className="text-xs text-muted-foreground">
          Effective {image.filter ? `${FILTER_PRESETS.find(f => f.id === image.filter)?.label} + manual` : "values"}:
          {" "}brightness {Math.round(composed.brightness)}, contrast {Math.round(composed.contrast)}, temperature {Math.round(composed.temperature)}.
        </p>
      </PanelSection>
    </>
  );
}

/* ── Filters ────────────────────────────────────────────── */

function FilterPanel({
  selected,
  dispatch,
}: {
  selected: EditorLayer | null;
  dispatch: (a: EditorAction) => void;
}) {
  const image = selected?.type === "image" ? selected : null;
  if (!image) {
    return (
      <PanelSection title="Filters">
        <p className="text-sm text-muted-foreground">
          Select an image layer to apply filters. Filters compose with manual
          adjustments.
        </p>
      </PanelSection>
    );
  }
  return (
    <PanelSection title={`Filters — ${image.name}`}>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Filter presets">
        <button
          type="button"
          onClick={() => dispatch({ type: "set-filter", id: image.id, filter: null })}
          aria-pressed={image.filter === null}
          className="rounded-lg border px-3 py-2 text-left text-xs font-medium hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/10"
        >
          None
        </button>
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => dispatch({ type: "set-filter", id: image.id, filter: preset.id })}
            aria-pressed={image.filter === preset.id}
            className="rounded-lg border px-3 py-2 text-left text-xs font-medium hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/10"
            data-testid={`filter-${preset.id}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {image.filter && (
        <PropSlider
          label="Filter strength"
          value={Math.round(image.filterAmount * 100)}
          min={5}
          max={100}
          unit="%"
          defaultValue={100}
          onChange={(v) => dispatch({ type: "set-filter", id: image.id, filter: image.filter, amount: v / 100, transient: true })}
          onCommit={() => dispatch({ type: "commit" })}
        />
      )}
    </PanelSection>
  );
}

/* ── Crop ───────────────────────────────────────────────── */

function CropPanel({
  onApply,
  aspect,
  onAspectChange,
  ready,
  blockedReason,
  straighten,
  onStraightenChange,
}: {
  onApply: () => void;
  aspect: string;
  onAspectChange: (v: string) => void;
  ready: boolean;
  blockedReason?: string | null;
  straighten: number;
  onStraightenChange: (value: number) => void;
}) {
  return (
    <PanelSection title="Crop">
      <p className="text-sm text-muted-foreground">
        Drag on the canvas to select the crop region, then apply. The crop
        applies to the selected image layer; the canvas resizes to match
        and other layers keep their relative position.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="crop-aspect" className="text-xs">Aspect ratio</Label>
        <Select value={aspect} onValueChange={onAspectChange}>
          <SelectTrigger id="crop-aspect" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="1:1">1:1 Square</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="3:4">3:4</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="3:2">3:2</SelectItem>
            <SelectItem value="2:3">2:3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="slider-straighten" className="text-xs">Straighten</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {straighten > 0 ? "+" : ""}{Math.round(straighten * 10) / 10}°
          </span>
        </div>
        <Slider
          id="slider-straighten"
          value={[straighten]}
          min={-15}
          max={15}
          step={0.5}
          onValueChange={([v]) => onStraightenChange(v)}
          aria-label="Straighten angle"
          data-testid="slider-straighten"
        />
      </div>
      {ready ? (
        <Button onClick={onApply} data-testid="apply-crop">
          Apply crop
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button disabled data-testid="apply-crop">
            Apply crop
          </Button>
          <p className="text-xs text-muted-foreground" role="status">
            {blockedReason ??
              "Drag a crop region on the canvas first (at least 4×4 px)."}
          </p>
        </div>
      )}
    </PanelSection>
  );
}

/* ── Text ───────────────────────────────────────────────── */

function TextPanel({
  selected,
  state,
  dispatch,
  focusLayerId,
  onFocused,
}: {
  selected: EditorLayer | null;
  state: EditorState;
  dispatch: (a: EditorAction) => void;
  focusLayerId?: string | null;
  onFocused?: () => void;
}) {
  const text = selected?.type === "text" ? selected : null;
  const addText = () => {
    dispatch({
      type: "add-layer",
      layer: {
        ...makeDefaultText(state.project.canvas.width, state.project.canvas.height),
      },
    });
  };
  return (
    <>
      <PanelSection title="Text layers">
        <Button variant="outline" size="sm" onClick={addText} data-testid="add-text">
          <Type data-icon="inline-start" />
          Add text layer
        </Button>
        {projectTextCount(state) === 0 && (
          <p className="text-xs text-muted-foreground">
            No text layers yet. Add one, then edit its content and style here.
          </p>
        )}
      </PanelSection>
      {text && (
        <>
          <PanelSection title="Content">
            <Input
              value={text.text}
              onChange={(e) =>
                dispatch({ type: "update-layer", id: text.id, patch: { text: e.target.value } as Partial<TextLayer>, transient: true })
              }
              onBlur={() => dispatch({ type: "commit" })}
              aria-label="Text content"
              placeholder="Your text"
              ref={(node) => {
                // Focus when the editor signals this layer (double-click)
                // or when a brand-new text layer is created.
                if (node && focusLayerId === text.id) {
                  node.focus();
                  node.select();
                  onFocused?.();
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "duplicate-layer", id: text.id })}
              >
                <Copy data-icon="inline-start" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: "remove-layer", id: text.id })}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </div>
          </PanelSection>
          <PanelSection title="Font">
            <div className="flex flex-col gap-2">
              <Label htmlFor="text-font" className="text-xs">Font family</Label>
              <Select
                value={fontKeyFor(text.fontFamily)}
                onValueChange={(v) =>
                  dispatch({ type: "update-layer", id: text.id, patch: { fontFamily: FONTS[v].css } as Partial<TextLayer> })
                }
              >
                <SelectTrigger id="text-font" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FONTS).map(([key, f]) => (
                    <SelectItem key={key} value={key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PropSlider
              label="Font size"
              value={Math.round(text.fontSize)}
              min={8}
              max={400}
              onChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { fontSize: v } as Partial<TextLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="text-weight" className="text-xs">Weight</Label>
              <Select
                value={String(text.fontWeight)}
                onValueChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { fontWeight: Number(v) } as Partial<TextLayer> })}
              >
                <SelectTrigger id="text-weight" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <SelectItem key={w} value={String(w)}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="text-italic" className="text-xs">Italic</Label>
              <Switch
                id="text-italic"
                checked={text.italic}
                onCheckedChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { italic: v } as Partial<TextLayer> })}
              />
            </div>
          </PanelSection>
          <PanelSection title="Color & layout">
            <ColorField
              label="Text color"
              value={text.color}
              onChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { color: v } as Partial<TextLayer> })}
            />
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Alignment</Label>
              <div className="flex gap-1" role="group" aria-label="Text alignment">
                {(["left", "center", "right"] as const).map((a) => (
                  <Button
                    key={a}
                    variant={text.align === a ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => dispatch({ type: "update-layer", id: text.id, patch: { align: a } as Partial<TextLayer> })}
                    aria-pressed={text.align === a}
                  >
                    {a === "left" ? "Left" : a === "center" ? "Center" : "Right"}
                  </Button>
                ))}
              </div>
            </div>
            <PropSlider
              label="Line height"
              value={Math.round(text.lineHeight * 100)}
              min={80}
              max={250}
              unit="%"
              defaultValue={130}
              onChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { lineHeight: v / 100 } as Partial<TextLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
            <PropSlider
              label="Letter spacing"
              value={text.letterSpacing}
              min={-10}
              max={40}
              defaultValue={0}
              onChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { letterSpacing: v } as Partial<TextLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
            <PropSlider
              label="Box width"
              value={Math.round(text.boxWidth)}
              min={40}
              max={Math.max(400, Math.round(state.project.canvas.width * 1.5))}
              onChange={(v) => dispatch({ type: "update-layer", id: text.id, patch: { boxWidth: v } as Partial<TextLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
          </PanelSection>
          <PanelSection title="Effects">
            <ColorField
              label="Text background"
              value={text.background?.color ?? "transparent"}
              onChange={(v) =>
                dispatch({
                  type: "update-layer",
                  id: text.id,
                  patch: {
                    background: text.background
                      ? { ...text.background, color: v }
                      : { color: v, padding: 12, radius: 6 },
                  } as Partial<TextLayer>,
                })
              }
              allowTransparent
            />
            <ColorField
              label="Outline"
              value={text.outline?.color ?? "transparent"}
              onChange={(v) =>
                dispatch({
                  type: "update-layer",
                  id: text.id,
                  patch: {
                    outline: text.outline ? { ...text.outline, color: v } : v === "transparent" ? null : { color: v, width: 2 },
                  } as Partial<TextLayer>,
                })
              }
              allowTransparent
            />
            {text.outline && (
              <PropSlider
                label="Outline width"
                value={text.outline.width}
                min={0.5}
                max={12}
                step={0.5}
                defaultValue={2}
                onChange={(v) =>
                  dispatch({ type: "update-layer", id: text.id, patch: { outline: { ...text.outline!, width: v } } as Partial<TextLayer>, transient: true })
                }
                onCommit={() => dispatch({ type: "commit" })}
              />
            )}
            <ColorField
              label="Shadow"
              value={text.shadow?.color ?? "transparent"}
              onChange={(v) =>
                dispatch({
                  type: "update-layer",
                  id: text.id,
                  patch: {
                    shadow:
                      v === "transparent"
                        ? null
                        : text.shadow
                          ? { ...text.shadow, color: v }
                          : { color: v, blur: 8, offsetX: 2, offsetY: 2 },
                  } as Partial<TextLayer>,
                })
              }
              allowTransparent
            />
            {text.shadow && (
              <PropSlider
                label="Shadow blur"
                value={text.shadow.blur}
                min={0}
                max={40}
                defaultValue={8}
                onChange={(v) =>
                  dispatch({ type: "update-layer", id: text.id, patch: { shadow: { ...text.shadow!, blur: v } } as Partial<TextLayer>, transient: true })
                }
                onCommit={() => dispatch({ type: "commit" })}
              />
            )}
          </PanelSection>
        </>
      )}
    </>
  );
}

const FONTS: Record<string, { label: string; css: string }> = {
  "system-sans": { label: "System Sans", css: "Inter, system-ui, -apple-system, sans-serif" },
  "system-serif": { label: "System Serif", css: "Georgia, 'Times New Roman', serif" },
  "system-mono": { label: "System Mono", css: "ui-monospace, 'SF Mono', Menlo, monospace" },
  arial: { label: "Arial", css: "Arial, Helvetica, sans-serif" },
  georgia: { label: "Georgia", css: "Georgia, serif" },
  "comic-neue": { label: "Comic Neue", css: "'Comic Neue', 'Comic Sans MS', cursive" },
  impact: { label: "Impact", css: "Impact, 'Arial Black', sans-serif" },
  "courier-new": { label: "Courier New", css: "'Courier New', Courier, monospace" },
};

function fontKeyFor(css: string): string {
  for (const [key, f] of Object.entries(FONTS)) {
    if (f.css === css) return key;
  }
  return "system-sans";
}

function projectTextCount(state: EditorState): number {
  return state.project.layers.filter((l) => l.type === "text").length;
}

function makeDefaultText(canvasW: number, canvasH: number): TextLayer {
  return {
    type: "text",
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "Text",
    visible: true,
    opacity: 1,
    x: canvasW / 2,
    y: canvasH / 2,
    rotation: 0,
    locked: false,
    text: "Your text",
    fontFamily: FONTS["system-sans"].css,
    fontSize: Math.max(16, Math.round(canvasW / 16)),
    fontWeight: 700,
    italic: false,
    color: "#111827",
    align: "center",
    lineHeight: 1.3,
    letterSpacing: 0,
    background: null,
    outline: null,
    shadow: null,
    boxWidth: Math.round(canvasW * 0.6),
  };
}

/* ── Elements (shapes) ─────────────────────────────────── */

function ElementsPanel({
  selected,
  state,
  dispatch,
}: {
  selected: EditorLayer | null;
  state: EditorState;
  dispatch: (a: EditorAction) => void;
}) {
  const shape = selected?.type === "shape" ? selected : null;
  const canvas = state.project.canvas;
  const addShape = (kind: ShapeLayer["shape"]) => {
    dispatch({
      type: "add-layer",
      layer: {
        type: "shape",
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: kind.charAt(0).toUpperCase() + kind.slice(1),
        visible: true,
        opacity: 1,
        x: canvas.width / 2,
        y: canvas.height / 2,
        rotation: 0,
        locked: false,
        shape: kind,
        width: Math.round(canvas.width * 0.25),
        height: Math.round(canvas.width * 0.25),
        fill: "#6366f1",
        stroke: null,
        strokeWidth: 0,
        radius: 8,
      },
    });
  };
  return (
    <>
      <PanelSection title="Shapes">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => addShape("rect")}>Rectangle</Button>
          <Button variant="outline" size="sm" onClick={() => addShape("ellipse")}>Ellipse</Button>
          <Button variant="outline" size="sm" onClick={() => addShape("triangle")}>Triangle</Button>
          <Button variant="outline" size="sm" onClick={() => addShape("line")}>Line</Button>
        </div>
      </PanelSection>
      {shape && (
        <PanelSection title={`${shape.name} — style`}>
          <ColorField
            label="Fill"
            value={shape.fill ?? "transparent"}
            onChange={(v) => dispatch({ type: "update-layer", id: shape.id, patch: { fill: v } as Partial<ShapeLayer> })}
            allowTransparent
          />
          <ColorField
            label="Stroke"
            value={shape.stroke ?? "transparent"}
            onChange={(v) =>
              dispatch({
                type: "update-layer",
                id: shape.id,
                patch: { stroke: v, strokeWidth: v === "transparent" ? 0 : Math.max(1, shape.strokeWidth || 4) } as Partial<ShapeLayer>,
              })
            }
            allowTransparent
          />
          {shape.stroke && shape.stroke !== "transparent" && (
            <PropSlider
              label="Stroke width"
              value={shape.strokeWidth}
              min={1}
              max={40}
              defaultValue={4}
              onChange={(v) => dispatch({ type: "update-layer", id: shape.id, patch: { strokeWidth: v } as Partial<ShapeLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
          )}
          {shape.shape === "rect" && (
            <PropSlider
              label="Corner radius"
              value={shape.radius}
              min={0}
              max={Math.round(Math.min(shape.width, shape.height) / 2)}
              defaultValue={0}
              onChange={(v) => dispatch({ type: "update-layer", id: shape.id, patch: { radius: v } as Partial<ShapeLayer>, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
          )}
          <PropSlider
            label="Width"
            value={Math.round(shape.width)}
            min={8}
            max={Math.round(state.project.canvas.width * 2)}
            onChange={(v) => dispatch({ type: "update-layer", id: shape.id, patch: { width: v } as Partial<ShapeLayer>, transient: true })}
            onCommit={() => dispatch({ type: "commit" })}
          />
          <PropSlider
            label="Height"
            value={Math.round(shape.height)}
            min={8}
            max={Math.round(state.project.canvas.height * 2)}
            onChange={(v) => dispatch({ type: "update-layer", id: shape.id, patch: { height: v } as Partial<ShapeLayer>, transient: true })}
            onCommit={() => dispatch({ type: "commit" })}
          />
        </PanelSection>
      )}
    </>
  );
}

/* ── Canvas ─────────────────────────────────────────────── */

function CanvasPanel({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: (a: EditorAction) => void;
}) {
  const c = state.project.canvas;
  return (
    <>
      <PanelSection title="Canvas size">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="canvas-width" className="text-xs">Width</Label>
            <Input
              id="canvas-width"
              type="number"
              min={16}
              max={8192}
              value={c.width}
              onChange={(e) =>
                dispatch({ type: "set-canvas", patch: { width: clampNum(e.target.value, 16, 8192, c.width) }, transient: true })
              }
              onBlur={() => dispatch({ type: "commit" })}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="canvas-height" className="text-xs">Height</Label>
            <Input
              id="canvas-height"
              type="number"
              min={16}
              max={8192}
              value={c.height}
              onChange={(e) =>
                dispatch({ type: "set-canvas", patch: { height: clampNum(e.target.value, 16, 8192, c.height) }, transient: true })
              }
              onBlur={() => dispatch({ type: "commit" })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="canvas-aspect" className="text-xs">Aspect ratio</Label>
          <Select
            value={c.aspectPreset}
            onValueChange={(v) => {
              const preset = v as AspectPresetId;
              dispatch({ type: "set-canvas", patch: { aspectPreset: preset } });
              if (preset !== "free") {
                const ratio = ASPECT_VALUES[preset];
                if (ratio) {
                  // Keep width, adjust height to the ratio.
                  dispatch({
                    type: "set-canvas",
                    patch: { height: Math.round(c.width / ratio) },
                  });
                }
              }
            }}
          >
            <SelectTrigger id="canvas-aspect" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(ASPECT_VALUES).map((k) => (
                <SelectItem key={k} value={k}>
                  {k === "free" ? "Free" : k === "original" ? "Original" : k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PanelSection>
      <PanelSection title="Appearance">
        <ColorField
          label="Background"
          value={c.background}
          onChange={(v) => dispatch({ type: "set-canvas", patch: { background: v } })}
          allowTransparent
        />
        <PropSlider
          label="Corner radius"
          value={c.borderRadius}
          min={0}
          max={Math.round(Math.min(c.width, c.height) / 2)}
          defaultValue={0}
          onChange={(v) => dispatch({ type: "set-canvas", patch: { borderRadius: v }, transient: true })}
          onCommit={() => dispatch({ type: "commit" })}
        />
        <PropSlider
          label="Padding"
          value={c.padding}
          min={0}
          max={200}
          defaultValue={0}
          onChange={(v) => dispatch({ type: "set-canvas", patch: { padding: v }, transient: true })}
          onCommit={() => dispatch({ type: "commit" })}
        />
      </PanelSection>
      <PanelSection title="Border">
        <div className="flex flex-col gap-2">
          <Label htmlFor="border-style" className="text-xs">Style</Label>
          <Select
            value={c.border.style}
            onValueChange={(v) =>
              dispatch({
                type: "set-canvas",
                patch: {
                  border: {
                    ...c.border,
                    style: v as BorderStyle,
                    // Sensible default when turning a border on (the
                    // project default width is 0 = invisible).
                    width: v === "none" ? 0 : c.border.width > 0 ? c.border.width : 4,
                  },
                },
              })
            }
          >
            <SelectTrigger id="border-style" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
              <SelectItem value="double">Double</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {c.border.style !== "none" && (
          <>
            <ColorField
              label="Border color"
              value={c.border.color}
              onChange={(v) =>
                dispatch({ type: "set-canvas", patch: { border: { ...c.border, color: v } } })
              }
            />
            <PropSlider
              label="Border width"
              value={c.border.width}
              min={1}
              max={80}
              onChange={(v) => dispatch({ type: "set-canvas", patch: { border: { ...c.border, width: v } }, transient: true })}
              onCommit={() => dispatch({ type: "commit" })}
            />
          </>
        )}
      </PanelSection>
    </>
  );
}

function clampNum(value: string, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
