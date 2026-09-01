"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ToolComponentProps } from "@/tools/tool-props";
import { siteUrl } from "@/lib/constants";

export function QrCodeGenerator({ tool }: ToolComponentProps) {
  const sizeOption = tool.options?.find((o) => o.key === "size");
  const marginOption = tool.options?.find((o) => o.key === "margin");
  const formatOption = tool.options?.find((o) => o.key === "format");

  const defaultSize = Number(sizeOption?.default ?? 256);
  const defaultMargin = Number(marginOption?.default ?? 4);
  const defaultFormat = (formatOption?.default as string) ?? "png";

  const [text, setText] = useState(siteUrl);
  const [size, setSize] = useState(defaultSize);
  const [margin, setMargin] = useState(defaultMargin);
  const [format, setFormat] = useState<"png" | "svg">(
    defaultFormat as "png" | "svg",
  );
  const [dataUrl, setDataUrl] = useState<string>("");
  const [svgString, setSvgString] = useState<string>("");

  useEffect(() => {
    if (!text) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDataUrl("");
      setSvgString("");
      return;
    }
    QRCode.toDataURL(text, { width: size, margin })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
    QRCode.toString(text, { type: "svg", margin })
      .then(setSvgString)
      .catch(() => setSvgString(""));
  }, [text, size, margin]);

  const download = () => {
    if (format === "png" && dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "qr-code.png";
      a.click();
    } else if (format === "svg" && svgString) {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qr-code.svg";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="qr-text">Text or URL</Label>
        <Input
          id="qr-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text or URL"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="qr-size">Size (px)</Label>
          <Input
            id="qr-size"
            type="number"
            min={64}
            max={1024}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="qr-margin">Margin</Label>
          <Input
            id="qr-margin"
            type="number"
            min={0}
            max={10}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="qr-format">Format</Label>
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as "png" | "svg")}
          >
            <SelectTrigger id="qr-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {dataUrl && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="QR code"
              className="rounded-lg border border-border"
            />
            <Button onClick={download}>
              <Download data-icon="inline-start" /> Download{" "}
              {format.toUpperCase()}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
