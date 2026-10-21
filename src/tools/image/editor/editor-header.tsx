"use client";

/**
 * Editor header: undo/redo/reset, zoom controls, mode title, export.
 */

import {
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditorState } from "./state";

export function EditorHeader({
  state,
  onUndo,
  onRedo,
  onReset,
  onZoom,
  onFit,
  onExport,
  canExport,
}: {
  state: EditorState;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onZoom: (zoom: number) => void;
  onFit: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const zoomPct = Math.round(state.ui.fitZoom ? 0 : state.ui.zoom * 100);
  const zoomLabel = state.ui.fitZoom ? "Fit" : `${zoomPct}%`;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={state.history.past.length === 0}
              aria-label="Undo"
              aria-keyshortcuts="Control+Z"
            >
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl/⌘+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={state.history.future.length === 0}
              aria-label="Redo"
              aria-keyshortcuts="Control+Shift+Z"
            >
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl/⌘+Shift+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              disabled={state.history.past.length === 0}
              aria-label="Reset all changes"
            >
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset all changes</TooltipContent>
        </Tooltip>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

      <div className="flex items-center gap-1" role="group" aria-label="Zoom">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoom(Math.max(0.05, (state.ui.fitZoom ? 1 : state.ui.zoom) / 1.25))}
              aria-label="Zoom out"
            >
              <ZoomOut />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {zoomLabel}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onZoom(Math.min(8, (state.ui.fitZoom ? 1 : state.ui.zoom) * 1.25))}
              aria-label="Zoom in"
            >
              <ZoomIn />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFit}
              aria-label="Fit image to view"
              aria-pressed={state.ui.fitZoom}
            >
              <Maximize />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={onExport} disabled={!canExport} data-testid="open-export">
          <Download data-icon="inline-start" />
          Export
        </Button>
      </div>
    </div>
  );
}
