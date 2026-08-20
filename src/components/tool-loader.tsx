"use client";

import dynamic from "next/dynamic";
import type { ToolDefinition } from "@/types/tool";
import { Loader2 } from "lucide-react";

const loading = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const TOOL_COMPONENTS: Record<
  string,
  React.ComponentType<{ tool: ToolDefinition }>
> = {
  "jpg-to-webp": dynamic(
    () =>
      import("@/tools/image/jpg-to-webp").then((m) => ({
        default: m.JpgToWebp,
      })),
    { loading },
  ),
  "png-to-webp": dynamic(
    () =>
      import("@/tools/image/png-to-webp").then((m) => ({
        default: m.PngToWebp,
      })),
    { loading },
  ),
  "webp-to-jpg": dynamic(
    () =>
      import("@/tools/image/webp-to-jpg").then((m) => ({
        default: m.WebpToJpg,
      })),
    { loading },
  ),
  "webp-to-png": dynamic(
    () =>
      import("@/tools/image/webp-to-png").then((m) => ({
        default: m.WebpToPng,
      })),
    { loading },
  ),
  "png-to-jpg": dynamic(
    () =>
      import("@/tools/image/png-to-jpg").then((m) => ({ default: m.PngToJpg })),
    { loading },
  ),
  "compress-image": dynamic(
    () =>
      import("@/tools/image/compress-image").then((m) => ({
        default: m.CompressImage,
      })),
    { loading },
  ),
  "resize-image": dynamic(
    () =>
      import("@/tools/image/resize-image").then((m) => ({
        default: m.ResizeImage,
      })),
    { loading },
  ),
  "merge-pdf": dynamic(
    () =>
      import("@/tools/pdf/merge-pdf").then((m) => ({ default: m.MergePdf })),
    { loading },
  ),
  "split-pdf": dynamic(
    () =>
      import("@/tools/pdf/split-pdf").then((m) => ({ default: m.SplitPdf })),
    { loading },
  ),
  "create-zip": dynamic(
    () =>
      import("@/tools/files/create-zip").then((m) => ({
        default: m.CreateZip,
      })),
    { loading },
  ),
  "extract-zip": dynamic(
    () =>
      import("@/tools/files/extract-zip").then((m) => ({
        default: m.ExtractZip,
      })),
    { loading },
  ),
  "json-formatter": dynamic(
    () =>
      import("@/tools/developer/json-formatter").then((m) => ({
        default: m.JsonFormatter,
      })),
    { loading },
  ),
  "json-minifier": dynamic(
    () =>
      import("@/tools/developer/json-minifier").then((m) => ({
        default: m.JsonMinifier,
      })),
    { loading },
  ),
  "base64-encode-decode": dynamic(
    () =>
      import("@/tools/developer/base64-encode-decode").then((m) => ({
        default: m.Base64EncodeDecode,
      })),
    { loading },
  ),
  "uuid-generator": dynamic(
    () =>
      import("@/tools/developer/uuid-generator").then((m) => ({
        default: m.UuidGenerator,
      })),
    { loading },
  ),
  "url-encode-decode": dynamic(
    () =>
      import("@/tools/developer/url-encode-decode").then((m) => ({
        default: m.UrlEncodeDecode,
      })),
    { loading },
  ),
  "hash-generator": dynamic(
    () =>
      import("@/tools/developer/hash-generator").then((m) => ({
        default: m.HashGenerator,
      })),
    { loading },
  ),
  "qr-code-generator": dynamic(
    () =>
      import("@/tools/web/qr-code-generator").then((m) => ({
        default: m.QrCodeGenerator,
      })),
    { loading },
  ),
  "word-counter": dynamic(
    () =>
      import("@/tools/text/word-counter").then((m) => ({
        default: m.WordCounter,
      })),
    { loading },
  ),
  "case-converter": dynamic(
    () =>
      import("@/tools/text/case-converter").then((m) => ({
        default: m.CaseConverter,
      })),
    { loading },
  ),
  "slug-generator": dynamic(
    () =>
      import("@/tools/text/slug-generator").then((m) => ({
        default: m.SlugGenerator,
      })),
    { loading },
  ),
  "whitespace-cleaner": dynamic(
    () =>
      import("@/tools/text/whitespace-cleaner").then((m) => ({
        default: m.WhitespaceCleaner,
      })),
    { loading },
  ),
  "color-converter": dynamic(
    () =>
      import("@/tools/colors/color-converter").then((m) => ({
        default: m.ColorConverter,
      })),
    { loading },
  ),
  "contrast-checker": dynamic(
    () =>
      import("@/tools/colors/contrast-checker").then((m) => ({
        default: m.ContrastChecker,
      })),
    { loading },
  ),
  "timestamp-converter": dynamic(
    () =>
      import("@/tools/datetime/timestamp-converter").then((m) => ({
        default: m.TimestampConverter,
      })),
    { loading },
  ),
  "unit-converter": dynamic(
    () =>
      import("@/tools/converters/unit-converter").then((m) => ({
        default: m.UnitConverter,
      })),
    { loading },
  ),
};

export function ToolLoader({ tool }: { tool: ToolDefinition }) {
  const Comp = TOOL_COMPONENTS[tool.slug];
  if (!Comp) {
    return (
      <p className="text-muted-foreground">This tool is not yet implemented.</p>
    );
  }
  return <Comp tool={tool} />;
}
