"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import bwipjs from "bwip-js/browser";
import {
  Download,
  Info,
  Barcode as BarcodeIcon,
  Settings2,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  BARCODE_CATEGORIES,
  DEFAULT_BCID,
  DOTTY_BCIDS,
  exportTypes,
  GUARD_BCIDS,
  initialStyling,
  symbologyByBcid,
  SYMBOLOGIES,
  TEXT_CAPABLE_BCIDS,
  defaultTextFor,
  type BarcodeStyling,
  type ExportFormat,
  type TextXAlign,
  type TextYAlign,
} from "@/tools/web/barcode/lib";
import {
  buildRenderOptions,
  describeRenderError,
  downloadBlob,
  svgViewBox,
  validateInput,
  withIntrinsicSize,
} from "@/tools/web/barcode/utils";

function LabelText({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
    >
      {children}
    </Label>
  );
}

export function BarcodeGenerator({ tool }: ToolComponentProps) {
  const [bcid, setBcid] = useState(DEFAULT_BCID);
  const [text, setText] = useState(() => defaultTextFor(DEFAULT_BCID));
  const [styling, setStyling] = useState<BarcodeStyling>(initialStyling);
  const [svg, setSvg] = useState("");
  const [renderError, setRenderError] = useState("");
  const [exporting, setExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const svgCacheRef = useRef("");

  const sym = symbologyByBcid.get(bcid);
  const supportsText = TEXT_CAPABLE_BCIDS.has(bcid);
  const supportsDotty = DOTTY_BCIDS.has(bcid);
  const supportsGuards = GUARD_BCIDS.has(bcid);

  const warnings = useMemo(() => validateInput(bcid, text), [bcid, text]);

  const update = <K extends keyof BarcodeStyling>(
    key: K,
    value: BarcodeStyling[K],
  ) => setStyling((prev) => ({ ...prev, [key]: value }));

  const selectBcid = (next: string) => {
    setBcid(next);
    setText(defaultTextFor(next));
    const nextSym = symbologyByBcid.get(next);
    update("parseAi", Boolean(nextSym?.gs1));
  };

  // Render: bwip-js → SVG string
  useEffect(() => {
    if (!text.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSvg("");
      setRenderError("");
      return;
    }

    let cancelled = false;

    const render = () => {
      try {
        const svgString = bwipjs.toSVG(
          buildRenderOptions(bcid, text, styling),
        );
        if (!cancelled) {
          svgCacheRef.current = svgString;
          setSvg(svgString);
          setRenderError("");
        }
      } catch (error) {
        if (!cancelled) {
          svgCacheRef.current = "";
          setSvg("");
          setRenderError(describeRenderError(error));
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [bcid, text, styling]);

  // Paint SVG into preview with intrinsic dimensions injected
  useEffect(() => {
    const host = previewRef.current;
    if (!host) return;
    if (svg) {
      host.innerHTML = withIntrinsicSize(svg, styling.scale);
      const el = host.firstElementChild as SVGSVGElement | null;
      if (el) {
        el.style.maxWidth = "100%";
        el.style.maxHeight = "24rem";
        el.style.width = "auto";
        el.style.height = "auto";
      }
    } else {
      host.innerHTML = "";
    }
  }, [svg, styling.scale]);

  const handleExport = async (format: ExportFormat) => {
    const current = svgCacheRef.current;
    if (!current) {
      toast.error("Nothing to export yet");
      return;
    }
    setExporting(true);
    try {
      if (format === "svg") {
        downloadBlob(
          `barcode-${bcid}.svg`,
          new Blob([current], { type: "image/svg+xml" }),
        );
      } else {
        const sized = withIntrinsicSize(current, styling.scale);
        const dims = svgViewBox(sized);
        const canvas = document.createElement("canvas");
        canvas.width = dims.width;
        canvas.height = dims.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        if (format === "jpeg") {
          ctx.fillStyle = styling.transparent ? "#ffffff" : styling.bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const img = await svgToImage(sized);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, `image/${format}`),
        );
        if (!blob) throw new Error("Export failed");
        downloadBlob(
          `barcode-${bcid}.${format === "jpeg" ? "jpg" : format}`,
          blob,
        );
      }
      toast.success(`${format.toUpperCase()} exported`);
    } catch (error) {
      console.error(error);
      toast.error(`${format.toUpperCase()} export failed`);
    } finally {
      setExporting(false);
    }
  };

  void tool;

  const grouped = BARCODE_CATEGORIES.map((cat) => ({
    ...cat,
    items: SYMBOLOGIES.filter((s) => s.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Input */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarcodeIcon className="size-4" aria-hidden="true" />
            Barcode Data
          </CardTitle>
          <CardDescription>
            Pick a symbology and enter the data to encode.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <LabelText htmlFor="barcode-type">Type</LabelText>
            <Select value={bcid} onValueChange={selectBcid}>
              <SelectTrigger id="barcode-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grouped.map((group) => (
                  <SelectGroup key={group.key}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map((s) => (
                      <SelectItem key={s.bcid} value={s.bcid}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sym?.hint && (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{sym.hint}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <LabelText htmlFor="barcode-text">Data</LabelText>
            <Textarea
              id="barcode-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter data to encode…"
              spellCheck={false}
              autoComplete="off"
              rows={2}
              className="min-h-16 font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Rendered live from{" "}
            {sym ? <span translate="no">{sym.label}</span> : bcid}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {renderError ? (
            <Alert variant="destructive">
              <X className="size-4" aria-hidden="true" />
              <AlertTitle>Render error</AlertTitle>
              <AlertDescription>{renderError}</AlertDescription>
            </Alert>
          ) : svg ? (
            <div
              className="flex min-h-40 items-center justify-center overflow-x-auto rounded-2xl border bg-muted/20 p-6"
              style={
                styling.transparent
                  ? undefined
                  : { backgroundColor: styling.bg }
              }
            >
              <div
                ref={previewRef}
                aria-label={`${sym?.label ?? bcid} barcode preview`}
                role="img"
                className="flex items-center justify-center"
              />
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center">
              <BarcodeIcon className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Enter data above to see the barcode…
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!svg || exporting}>
                  <Download data-icon="inline-start" aria-hidden="true" />
                  {exporting ? "Exporting…" : "Download"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {exportTypes.map((format) => (
                  <DropdownMenuItem
                    key={format}
                    onClick={() => void handleExport(format)}
                    disabled={!svg || exporting}
                  >
                    <span className="uppercase">{format}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-xs text-muted-foreground">
              Length:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {text.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Styling */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-4" aria-hidden="true" /> Styling
          </CardTitle>
          <CardDescription>
            Fine-tune geometry, text, quiet zone, border and colors.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* ── Geometry ─────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Geometry</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <LabelText>Module Width</LabelText>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {styling.scale}×
                </span>
              </div>
              <Slider
                value={[styling.scale]}
                min={1}
                max={8}
                step={1}
                onValueChange={([v]) => update("scale", v)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <LabelText>Bar Height</LabelText>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {styling.height}&nbsp;mm
                </span>
              </div>
              <Slider
                value={[styling.height]}
                min={5}
                max={120}
                step={5}
                onValueChange={([v]) => update("height", v)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <LabelText htmlFor="barcode-rotate">Rotation</LabelText>
              <Select
                value={styling.rotate}
                onValueChange={(v) =>
                  update("rotate", v as BarcodeStyling["rotate"])
                }
              >
                <SelectTrigger id="barcode-rotate" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">Upright</SelectItem>
                  <SelectItem value="R">90° Clockwise</SelectItem>
                  <SelectItem value="L">90° Counter-Clockwise</SelectItem>
                  <SelectItem value="I">180°</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <LabelText>Ink Spread</LabelText>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {styling.inkSpread.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[styling.inkSpread]}
                min={-1}
                max={1}
                step={0.1}
                onValueChange={([v]) =>
                  update("inkSpread", Math.round(v * 10) / 10)
                }
              />
              <p className="text-xs text-muted-foreground">
                Widen or narrow bars to compensate for printing gain.
              </p>
            </div>
          </section>

          {/* ── Quiet Zone (padding) ─────────────── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Quiet Zone</h3>
              <Switch
                id="barcode-padding-per-side"
                checked={styling.paddingPerSide}
                onCheckedChange={(checked) =>
                  update("paddingPerSide", checked)
                }
                aria-label="Set padding per side"
              />
            </div>
            <div>
              <Label
                htmlFor="barcode-padding-per-side"
                className="text-xs text-muted-foreground"
              >
                Per-side padding
              </Label>
            </div>

            {!styling.paddingPerSide ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <LabelText>Padding</LabelText>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {styling.padding}&nbsp;mm
                  </span>
                </div>
                <Slider
                  value={[styling.padding]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={([v]) => update("padding", v)}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["paddingLeft", "Left", "pl"],
                    ["paddingRight", "Right", "pr"],
                    ["paddingTop", "Top", "pt"],
                    ["paddingBottom", "Bottom", "pb"],
                  ] as const
                ).map(([key, label, short]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <LabelText htmlFor={`barcode-${short}`}>{label}</LabelText>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {styling[key]}&nbsp;mm
                      </span>
                    </div>
                    <Slider
                      value={[styling[key]]}
                      min={0}
                      max={40}
                      step={1}
                      onValueChange={([v]) => update(key, v)}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Keep at least 10&nbsp;mm on the left and right of 1D codes for
              reliable scanning.
            </p>
          </section>

          {/* ── Human-readable text ─────────────── */}
          {supportsText && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Switch
                  id="barcode-show-text"
                  checked={styling.showText}
                  onCheckedChange={(checked) => update("showText", checked)}
                />
                <div>
                  <Label
                    htmlFor="barcode-show-text"
                    className="text-sm font-medium"
                  >
                    Human-Readable Text
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Print the data near the bars.
                  </div>
                </div>
              </div>

              {styling.showText && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <LabelText htmlFor="barcode-alt-text">
                      Custom Caption
                    </LabelText>
                    <Input
                      id="barcode-alt-text"
                      value={styling.altText}
                      onChange={(e) => update("altText", e.target.value)}
                      placeholder="Leave empty to print the encoded data…"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <LabelText>Text Size</LabelText>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {styling.textSize}&nbsp;pt
                      </span>
                    </div>
                    <Slider
                      value={[styling.textSize]}
                      min={5}
                      max={30}
                      step={1}
                      onValueChange={([v]) => update("textSize", v)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <LabelText htmlFor="barcode-text-xalign">
                        Horizontal Align
                      </LabelText>
                      <Select
                        value={styling.textXAlign}
                        onValueChange={(v) =>
                          update("textXAlign", v as TextXAlign)
                        }
                      >
                        <SelectTrigger id="barcode-text-xalign" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="offleft">Off Left</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="offright">Off Right</SelectItem>
                          <SelectItem value="justify">Justify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <LabelText htmlFor="barcode-text-yalign">
                        Vertical Align
                      </LabelText>
                      <Select
                        value={styling.textYAlign}
                        onValueChange={(v) =>
                          update("textYAlign", v as TextYAlign)
                        }
                      >
                        <SelectTrigger id="barcode-text-yalign" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="below">Below Bars</SelectItem>
                          <SelectItem value="center">Centered</SelectItem>
                          <SelectItem value="above">Above Bars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <LabelText>X Offset</LabelText>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {styling.textXOffset}&nbsp;mm
                        </span>
                      </div>
                      <Slider
                        value={[styling.textXOffset]}
                        min={-20}
                        max={20}
                        step={1}
                        onValueChange={([v]) => update("textXOffset", v)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <LabelText>Y Offset</LabelText>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {styling.textYOffset}&nbsp;mm
                        </span>
                      </div>
                      <Slider
                        value={[styling.textYOffset]}
                        min={-20}
                        max={20}
                        step={1}
                        onValueChange={([v]) => update("textYOffset", v)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <LabelText htmlFor="barcode-text-color">Text Color</LabelText>
                    <Input
                      id="barcode-text-color"
                      type="color"
                      value={styling.textColor}
                      onChange={(e) => update("textColor", e.target.value)}
                      className="h-10 w-24 p-1"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Colors ───────────────────────────── */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Colors</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <LabelText htmlFor="barcode-fg">Bars</LabelText>
                <Input
                  id="barcode-fg"
                  type="color"
                  value={styling.fg}
                  onChange={(e) => update("fg", e.target.value)}
                  className="h-10 w-24 p-1"
                />
              </div>
              {!styling.transparent && (
                <div className="flex flex-col gap-2">
                  <LabelText htmlFor="barcode-bg">Background</LabelText>
                  <Input
                    id="barcode-bg"
                    type="color"
                    value={styling.bg}
                    onChange={(e) => update("bg", e.target.value)}
                    className="h-10 w-24 p-1"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Switch
                id="barcode-transparent"
                checked={styling.transparent}
                onCheckedChange={(checked) => update("transparent", checked)}
              />
              <div>
                <Label
                  htmlFor="barcode-transparent"
                  className="text-sm font-medium"
                >
                  Transparent Background
                </Label>
                <div className="text-xs text-muted-foreground">
                  For overlays on colored surfaces.
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Dark bars on a light background scan most reliably.
            </p>
          </section>

          {/* ── Border ──────────────────────────── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Switch
                id="barcode-border"
                checked={styling.showBorder}
                onCheckedChange={(checked) => update("showBorder", checked)}
              />
              <div>
                <Label htmlFor="barcode-border" className="text-sm font-medium">
                  Border
                </Label>
                <div className="text-xs text-muted-foreground">
                  Frame the quiet zone with a printable box.
                </div>
              </div>
            </div>

            {styling.showBorder && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <LabelText>Border Width</LabelText>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {styling.borderWidth}&nbsp;mm
                      </span>
                    </div>
                    <Slider
                      value={[styling.borderWidth]}
                      min={0.5}
                      max={10}
                      step={0.5}
                      onValueChange={([v]) => update("borderWidth", v)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <LabelText htmlFor="barcode-border-color">
                      Border Color
                    </LabelText>
                    <Input
                      id="barcode-border-color"
                      type="color"
                      value={styling.borderColor}
                      onChange={(e) => update("borderColor", e.target.value)}
                      className="h-10 w-24 p-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["borderLeft", "Left", "bl"],
                      ["borderRight", "Right", "br"],
                      ["borderTop", "Top", "bt"],
                      ["borderBottom", "Bottom", "bb"],
                    ] as const
                  ).map(([key, label, short]) => (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <LabelText htmlFor={`barcode-${short}`}>
                          {label} Extra
                        </LabelText>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {styling[key]}&nbsp;mm
                        </span>
                      </div>
                      <Slider
                        value={[styling[key]]}
                        min={0}
                        max={30}
                        step={1}
                        onValueChange={([v]) => update(key, v)}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Extra thickness adds padding outside the border on each
                  side.
                </p>
              </div>
            )}
          </section>

          {/* ── Advanced ────────────────────────── */}
          <section className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold">Advanced</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {sym?.gs1 && (
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch
                    id="barcode-parse-ai"
                    checked={styling.parseAi}
                    onCheckedChange={(checked) => update("parseAi", checked)}
                  />
                  <div>
                    <Label
                      htmlFor="barcode-parse-ai"
                      className="text-sm font-medium"
                    >
                      Parse GS1 AIs
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Convert (01)… parentheses into FNC1 groups.
                    </div>
                  </div>
                </div>
              )}

              {supportsGuards && (
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch
                    id="barcode-guards"
                    checked={styling.guardWhitespace}
                    onCheckedChange={(checked) =>
                      update("guardWhitespace", checked)
                    }
                  />
                  <div>
                    <Label
                      htmlFor="barcode-guards"
                      className="text-sm font-medium"
                    >
                      Guard Bars
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      EAN/UPC style guard marks and whitespace.
                    </div>
                  </div>
                </div>
              )}

              {supportsDotty && (
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch
                    id="barcode-dotty"
                    checked={styling.dotty}
                    onCheckedChange={(checked) => update("dotty", checked)}
                  />
                  <div>
                    <Label
                      htmlFor="barcode-dotty"
                      className="text-sm font-medium"
                    >
                      Dot Matrix
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Round dots instead of squares for 2D codes.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Switch
                  id="barcode-include-check"
                  checked={styling.includeCheck}
                  onCheckedChange={(checked) =>
                    update("includeCheck", checked)
                  }
                />
                <div>
                  <Label
                    htmlFor="barcode-include-check"
                    className="text-sm font-medium"
                  >
                    Check Digit in Text
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Show the computed check digit in the caption.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <X className="size-4" aria-hidden="true" />
          <AlertTitle>Check before you print</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 pt-2">
            {warnings.map((warning) => (
              <div
                key={warning.title}
                className="rounded-xl border bg-background p-3 text-foreground"
              >
                <div className="font-medium">{warning.title}</div>
                <div className="text-sm text-muted-foreground">
                  {warning.description}
                </div>
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Load an SVG string into an HTMLImageElement. */
function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG could not be loaded as an image"));
    };
    img.src = url;
  });
}
