"use client";

import { useState } from "react";
import {
  parse,
  formatCss,
  formatHex,
  formatRgb,
  formatHsl,
  rgb,
  hsl,
  hsv,
  oklch,
  oklab,
  lab,
  lch,
  type Color,
} from "culori";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { CodeBlock } from "@/components/code-block";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roundColor } from "./culori-utils";

const FORMATS = [
  { label: "HEX", value: "hex" },
  { label: "RGB", value: "rgb" },
  { label: "HSL", value: "hsl" },
  { label: "HSV", value: "hsv" },
  { label: "OKLCH", value: "oklch" },
  { label: "OKLab", value: "oklab" },
  { label: "LAB", value: "lab" },
  { label: "LCH", value: "lch" },
] as const;

type Format = (typeof FORMATS)[number]["value"];

const PLACEHOLDERS: Record<Format, string> = {
  hex: "#6366f1",
  rgb: "rgb(99, 102, 241)",
  hsl: "hsl(239, 84%, 67%)",
  hsv: "hsv(239, 84%, 95%)",
  oklch: "oklch(0.585 0.233 277.117)",
  oklab: "oklab(0.585 -0.119 0.202)",
  lab: "lab(54, 38.5, -83.4)",
  lch: "lch(54, 91.5, 294.5)",
};

// culori's formatCss renders a color in its own mode, so convert first
const converters: Record<Format, (c: Color) => string> = {
  hex: (c) => formatHex(c),
  rgb: (c) => formatRgb(rgb(c)),
  hsl: (c) => formatHsl(hsl(c)),
  hsv: (c) => {
    const h = roundColor(hsv(c), 2);
    return `hsv(${h.h} ${Math.round(h.s * 100)}% ${Math.round(h.v * 100)}%)`;
  },
  oklch: (c) => formatCss(roundColor(oklch(c), 2)),
  oklab: (c) => formatCss(roundColor(oklab(c), 2)),
  lab: (c) => formatCss(roundColor(lab(c), 2)),
  lch: (c) => formatCss(roundColor(lch(c), 2)),
};

function convert(parsed: Color, target: Format): string {
  try {
    return converters[target](parsed) || "";
  } catch {
    return "";
  }
}

export function ColorConverter({}: ToolComponentProps) {
  const [fromFormat, setFromFormat] = useState<Format>("hex");
  const [toFormat, setToFormat] = useState<Format>("oklch");
  const [input, setInput] = useState("#6366f1");

  // culori's parse accepts any CSS color string, regardless of the
  // selected "from" format — the dropdown just guides the placeholder.
  const parsed = parse(input);

  const converted = parsed ? convert(parsed, toFormat) : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cc-from">From format</Label>
          <Select value={fromFormat} onValueChange={(v) => setFromFormat(v as Format)}>
            <SelectTrigger id="cc-from" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="cc-input">Color value</Label>
          <Input
            id="cc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDERS[fromFormat]}
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cc-to">To format</Label>
          <Select value={toFormat} onValueChange={(v) => setToFormat(v as Format)}>
            <SelectTrigger id="cc-to" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {converted && (
          <div className="flex min-w-48 flex-1 items-center gap-2">
            <CodeBlock code={converted} language="text" />
            <CopyToClipboard value={converted} variant="outline" showLabel />
          </div>
        )}
      </div>

      {input && !parsed && (
        <p className="text-sm text-destructive">
          Not a recognizable color. Paste any CSS color — hex, rgb(), hsl(),
          oklch(), or a named color like rebeccapurple.
        </p>
      )}

      {parsed && (
        <div
          className="h-24 rounded-lg border border-border"
          style={{ backgroundColor: formatCss(parsed) }}
        />
      )}

      {parsed && (
        <div className="flex flex-col gap-2">
          {FORMATS.map((f) => {
            const value = convert(parsed, f.value);
            if (!value) return null;
            return (
              <Card key={f.label}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="truncate font-mono text-sm">{value}</p>
                  </div>
                  <CopyToClipboard value={value} variant="ghost" size="sm" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
