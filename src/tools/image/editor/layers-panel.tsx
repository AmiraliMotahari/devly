"use client";

/**
 * Layers panel: visibility, z-order controls, duplicate/delete, selection.
 */

import {
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  Image as ImageIcon,
  Type,
  Shapes,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditorAction, EditorState } from "./state";
import type { EditorLayer } from "../types/editor";

function LayerIcon({ type }: { type: EditorLayer["type"] }) {
  if (type === "image") return <ImageIcon className="size-3.5 shrink-0" />;
  if (type === "text") return <Type className="size-3.5 shrink-0" />;
  return <Shapes className="size-3.5 shrink-0" />;
}

export function LayersPanel({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: (a: EditorAction) => void;
}) {
  // Show top layer first (paint order is bottom→top).
  const layers = [...state.project.layers].reverse();
  const selectedId = state.selectedLayerId;

  return (
    <div
      className="flex min-h-0 flex-col gap-2"
      data-testid="layers-panel"
      aria-label="Layers"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layers
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {layers.length}
        </span>
      </div>
      {layers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No layers yet. Import an image to start.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto" role="listbox" aria-label="Layers list">
          {layers.map((layer) => {
            const active = layer.id === selectedId;
            return (
              <li key={layer.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                    active ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent",
                  )}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => dispatch({ type: "select-layer", id: layer.id })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <LayerIcon type={layer.type} />
                    <span className="truncate text-xs font-medium">{layer.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() =>
                            dispatch({ type: "update-layer", id: layer.id, patch: { visible: !layer.visible } })
                          }
                          aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                        >
                          {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{layer.visible ? "Hide" : "Show"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: "reorder-layer", id: layer.id, action: "forward" })}
                          aria-label={`Bring ${layer.name} forward`}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bring forward</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: "reorder-layer", id: layer.id, action: "backward" })}
                          aria-label={`Send ${layer.name} backward`}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send backward</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: "reorder-layer", id: layer.id, action: "front" })}
                          aria-label={`Bring ${layer.name} to front`}
                        >
                          <ChevronsUp className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bring to front</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: "reorder-layer", id: layer.id, action: "back" })}
                          aria-label={`Send ${layer.name} to back`}
                        >
                          <ChevronsDown className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send to back</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => dispatch({ type: "duplicate-layer", id: layer.id })}
                          aria-label={`Duplicate ${layer.name}`}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicate</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-destructive hover:text-destructive"
                          onClick={() => dispatch({ type: "remove-layer", id: layer.id })}
                          aria-label={`Delete ${layer.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
