"use client";

import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  formatCss,
  formatHex,
  formatHsl,
  formatRgb,
  hsl,
  hsv,
  lab,
  lch,
  oklab,
  oklch,
  parse,
  rgb,
  type Color,
} from "culori";
import { useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
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

const converters: Record<Format, (color: Color) => string> = {
  hex: formatHex,
  rgb: (color) => formatRgb(rgb(color)),
  hsl: (color) => formatHsl(hsl(color)),
  hsv: (color) => {
    const value = roundColor(hsv(color), 2);

    return `hsv(${value.h} ${Math.round(value.s * 100)}% ${Math.round(
      value.v * 100,
    )}%)`;
  },
  oklch: (color) => formatCss(roundColor(oklch(color), 2)),
  oklab: (color) => formatCss(roundColor(oklab(color), 2)),
  lab: (color) => formatCss(roundColor(lab(color), 2)),
  lch: (color) => formatCss(roundColor(lch(color), 2)),
};

function convert(color: Color, format: Format): string {
  try {
    return converters[format](color);
  } catch {
    return "";
  }
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <InputGroupButton
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Open color picker"
          className="mr-0.5"
        >
          <span
            className="size-5 rounded-sm border border-black/10 shadow-xs"
            style={{ backgroundColor: color }}
          />
        </InputGroupButton>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-auto p-3">
        <HexColorPicker
          color={color}
          onChange={onChange}
          className="h-52! w-64!"
        />

        <div className="mt-3 flex items-center gap-2">
          <span
            className="size-8 shrink-0 rounded-md border"
            style={{ backgroundColor: color }}
            aria-hidden
          />

          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-xs">
            {color}
          </code>

          <CopyToClipboard
            value={color}
            variant="ghost"
            size="sm"
            aria-label="Copy HEX color"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ColorConverter({}: ToolComponentProps) {
  const [fromFormat, setFromFormat] = useState<Format>("hex");
  const [toFormat, setToFormat] = useState<Format>("oklch");
  const [input, setInput] = useState("#6366f1");

  const parsed = useMemo(() => parse(input), [input]);

  const converted = useMemo(
    () => (parsed ? convert(parsed, toFormat) : ""),
    [parsed, toFormat],
  );

  const formattedValues = useMemo(() => {
    if (!parsed) return [];

    return FORMATS.map((format) => ({
      ...format,
      value: convert(parsed, format.value),
    })).filter((format) => format.value);
  }, [parsed]);

  const inputIsInvalid = input.trim().length > 0 && !parsed;
  const pickerColor = parsed ? formatHex(parsed) : "#6366f1";
  const previewColor = parsed ? formatCss(parsed) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Input */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="cc-input">Color value</Label>

          <span className="text-xs text-muted-foreground">CSS color</span>
        </div>

        <InputGroup>
          <InputGroupInput
            id="cc-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={PLACEHOLDERS[fromFormat]}
            aria-invalid={inputIsInvalid}
            className="font-mono"
          />

          {parsed && (
            <InputGroupAddon align="inline-end">
              <ColorPicker color={pickerColor} onChange={setInput} />
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="flex flex-wrap gap-1.5">
          {FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              onClick={() => setFromFormat(format.value)}
              className="rounded-md border px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {format.label}
            </button>
          ))}
        </div>

        {inputIsInvalid && (
          <p className="text-sm text-destructive">
            Not a recognizable color. Try a HEX, rgb(), hsl(), oklch(), or a
            named color such as <code>rebeccapurple</code>.
          </p>
        )}
      </section>

      {/* Conversion */}
      <section className="flex flex-col gap-3">
        <Label htmlFor="cc-to">Convert to</Label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={toFormat}
            onValueChange={(value) => setToFormat(value as Format)}
          >
            <SelectTrigger id="cc-to" className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {converted && (
            <InputGroup className="justify-between">
              <InputGroupText className="ps-2">
                <code className="font-mono">{converted}</code>
              </InputGroupText>
              <InputGroupAddon align={"inline-end"}>
                <InputGroupButton asChild>
                  <CopyToClipboard value={converted} variant="outline" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          )}
        </div>
      </section>

      {/* Preview */}
      {parsed && previewColor && (
        <section className="overflow-hidden rounded-lg border">
          <div
            className="h-20"
            style={{ backgroundColor: previewColor }}
            role="img"
            aria-label={`Color preview: ${formatHex(parsed)}`}
          />

          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-4 shrink-0 rounded-sm border"
                style={{ backgroundColor: previewColor }}
                aria-hidden
              />

              <code className="truncate font-mono text-xs text-muted-foreground">
                {formatHex(parsed)}
              </code>
            </div>

            <span className="text-xs text-muted-foreground">Preview</span>
          </div>
        </section>
      )}

      {/* Formats */}
      {formattedValues.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {formattedValues.map((format) => (
            <Card key={format.value}>
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="size-8 shrink-0 rounded-md border"
                  style={{ backgroundColor: previewColor }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {format.label}
                  </p>

                  <p className="truncate font-mono text-sm">{format.value}</p>
                </div>

                <CopyToClipboard
                  value={format.value}
                  variant="ghost"
                  size="sm"
                  aria-label={`Copy ${format.label} value`}
                />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
