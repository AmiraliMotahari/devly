"use client";

/**
 * Left rail toolbar: editor modes (select/crop/adjust/filters/text/
 * elements/canvas/background-removal/merge/split/collage) + import.
 * Collapses to a bottom bar on mobile (CSS handles layout; the component
 * stays the same).
 */

import {
  MousePointer2,
  Crop,
  SlidersHorizontal,
  Sparkles,
  Type,
  Shapes,
  Frame,
  Scissors,
  Images,
  LayoutGrid,
  Eraser,
  Upload,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditorMode } from "./state";

const MODES: {
  id: EditorMode;
  label: string;
  icon: typeof Crop;
  hint: string;
}[] = [
  { id: "select", label: "Select", icon: MousePointer2, hint: "Select and move layers" },
  { id: "crop", label: "Crop", icon: Crop, hint: "Crop the image" },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal, hint: "Brightness, contrast, colors" },
  { id: "filters", label: "Filters", icon: Sparkles, hint: "Filter presets" },
  { id: "text", label: "Text", icon: Type, hint: "Add text layers" },
  { id: "elements", label: "Elements", icon: Shapes, hint: "Shapes and images" },
  { id: "canvas", label: "Canvas", icon: Frame, hint: "Size, background, border" },
  { id: "background-removal", label: "Remove BG", icon: Eraser, hint: "Remove image background" },
  { id: "merge", label: "Merge", icon: Images, hint: "Combine images into one" },
  { id: "split", label: "Split", icon: Scissors, hint: "Split into rows/columns/grid" },
  { id: "collage", label: "Collage", icon: LayoutGrid, hint: "Collage from multiple images" },
];

export function EditorToolbar({
  mode,
  onModeChange,
  onImport,
  hasImages,
  importDisabled,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onImport: () => void;
  hasImages: boolean;
  importDisabled?: string | null;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
      role="toolbar"
      aria-label="Editor tools"
      aria-orientation="vertical"
      data-testid="editor-toolbar"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onImport}
            aria-label="Import images"
            disabled={!!importDisabled}
            className="shrink-0"
          >
            <Upload />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Import images{importDisabled ? ` — ${importDisabled}` : ""}</TooltipContent>
      </Tooltip>
      <div className="hidden md:block h-px bg-border my-1" aria-hidden />
      {MODES.map((m) => {
        // Text and Elements work without images (text-only designs); the
        // image-centric modes require at least one imported image.
        const needsImage = !["select", "canvas", "text", "elements"].includes(m.id);
        const disabled =
          !hasImages && needsImage ? "Import an image first" : null;
        const Icon = m.icon;
        const button = (
          <Button
            key={m.id}
            variant={mode === m.id ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onModeChange(m.id)}
            aria-label={m.label}
            aria-pressed={mode === m.id}
            disabled={!!disabled}
            className={cn(
              "shrink-0 relative",
              mode === m.id && "bg-muted",
            )}
          >
            <Icon />
            {mode === m.id && (
              <span
                className="absolute left-0 top-1/2 hidden h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary md:block"
                aria-hidden
              />
            )}
          </Button>
        );
        return (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right">
              {m.hint}
              {disabled ? ` — ${disabled}` : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
