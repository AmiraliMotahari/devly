"use client";

import { useState } from "react";
import { parse, formatCss, oklch, type Oklch } from "culori";
import { roundColor } from "./culori-utils";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyToClipboard } from "@/components/copy-to-clipboard";



export function HexToOklch({}: ToolComponentProps) {
  const [hex, setHex] = useState("#6366f1");

  const parsed = parse(hex);
  const valid = parsed !== null;

  const oklchColor: Oklch | null = valid
    ? roundColor(oklch(parsed) as Oklch, 3)
    : null;
  const cssString = oklchColor ? formatCss(oklchColor) : "";
  const compact = oklchColor
    ? `oklch(${Math.round(oklchColor.l * 100)}% ${oklchColor.c} ${oklchColor.h})`
    : "";

  const outputs = [
    { label: "OKLCH (CSS)", value: cssString },
    { label: "OKLCH (percentage lightness)", value: compact },
  ].filter((o) => o.value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hex-input">Color picker</Label>
          <input
            id="hex-input"
            type="color"
            value={valid ? hex : "#6366f1"}
            onChange={(e) => setHex(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded-md border border-border"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="hex-text">HEX value</Label>
          <Input
            id="hex-text"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#6366f1"
            className="w-44 font-mono"
          />
        </div>
      </div>

      {hex && !valid && (
        <p className="text-sm text-destructive">
          Not a valid hex color. Use #rgb or #rrggbb form.
        </p>
      )}

      {valid && (
        <div
          className="h-24 rounded-lg border border-border"
          style={{ backgroundColor: formatCss(parsed) }}
        />
      )}

      {outputs.length > 0 && (
        <div className="flex flex-col gap-2">
          {outputs.map((o) => (
            <Card key={o.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{o.label}</p>
                  <p className="truncate font-mono text-sm">{o.value}</p>
                </div>
                <CopyToClipboard value={o.value} variant="ghost" size="sm" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
