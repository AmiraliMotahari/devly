"use client";

import dynamic from "next/dynamic";
import type { ToolDefinition } from "@/types/tool";
import { Loader2 } from "lucide-react";

const loading = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
  "rotate-image": dynamic(
    () =>
      import("@/tools/image/rotate-image").then((m) => ({
        default: m.RotateImage,
      })),
    { loading },
  ),
  "flip-image": dynamic(
    () =>
      import("@/tools/image/flip-image").then((m) => ({
        default: m.FlipImage,
      })),
    { loading },
  ),
  "image-filters": dynamic(
    () =>
      import("@/tools/image/image-filters").then((m) => ({
        default: m.ImageFilters,
      })),
    { loading },
  ),
  "favicon-generator": dynamic(
    () =>
      import("@/tools/image/favicon-generator").then((m) => ({
        default: m.FaviconGenerator,
      })),
    { loading },
  ),
  "social-image-optimizer": dynamic(
    () =>
      import("@/tools/image/social-image-optimizer").then((m) => ({
        default: m.SocialImageOptimizer,
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
  "compress-pdf": dynamic(
    () =>
      import("@/tools/pdf/compress-pdf").then((m) => ({
        default: m.CompressPdf,
      })),
    { loading },
  ),
  "rotate-pdf": dynamic(
    () =>
      import("@/tools/pdf/rotate-pdf").then((m) => ({ default: m.RotatePdf })),
    { loading },
  ),
  "pdf-to-images": dynamic(
    () =>
      import("@/tools/pdf/pdf-to-images").then((m) => ({
        default: m.PdfToImages,
      })),
    { loading },
  ),
  "extract-images": dynamic(
    () =>
      import("@/tools/pdf/extract-images").then((m) => ({
        default: m.ExtractImages,
      })),
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
  "create-encrypted-zip": dynamic(
    () =>
      import("@/tools/files/create-encrypted-zip").then((m) => ({
        default: m.CreateEncryptedZip,
      })),
    { loading },
  ),
  "checksum-generator": dynamic(
    () =>
      import("@/tools/files/checksum-generator").then((m) => ({
        default: m.ChecksumGenerator,
      })),
    { loading },
  ),
  "file-metadata": dynamic(
    () =>
      import("@/tools/files/file-metadata").then((m) => ({
        default: m.FileMetadata,
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
  "json-schema-generator": dynamic(
    () =>
      import("@/tools/developer/json-schema-generator").then((m) => ({
        default: m.JsonSchemaGenerator,
      })),
    { loading },
  ),
  "yaml-formatter": dynamic(
    () =>
      import("@/tools/developer/yaml-formatter").then((m) => ({
        default: m.YamlFormatter,
      })),
    { loading },
  ),
  "xml-formatter": dynamic(
    () =>
      import("@/tools/developer/xml-formatter").then((m) => ({
        default: m.XmlFormatter,
      })),
    { loading },
  ),
  "jwt-decoder": dynamic(
    () =>
      import("@/tools/developer/jwt-decoder").then((m) => ({
        default: m.JwtDecoder,
      })),
    { loading },
  ),
  "cron-parser": dynamic(
    () =>
      import("@/tools/developer/cron-parser").then((m) => ({
        default: m.CronParser,
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
  "meta-tag-generator": dynamic(
    () =>
      import("@/tools/web/meta-tag-generator").then((m) => ({
        default: m.MetaTagGenerator,
      })),
    { loading },
  ),
  "robots-generator": dynamic(
    () =>
      import("@/tools/web/robots-generator").then((m) => ({
        default: m.RobotsGenerator,
      })),
    { loading },
  ),
  "sitemap-generator": dynamic(
    () =>
      import("@/tools/web/sitemap-generator").then((m) => ({
        default: m.SitemapGenerator,
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
  "markdown-to-html": dynamic(
    () =>
      import("@/tools/text/markdown-to-html").then((m) => ({
        default: m.MarkdownToHtml,
      })),
    { loading },
  ),
  "html-to-markdown": dynamic(
    () =>
      import("@/tools/text/html-to-markdown").then((m) => ({
        default: m.HtmlToMarkdown,
      })),
    { loading },
  ),
  "html-minifier": dynamic(
    () =>
      import("@/tools/text/html-minifier").then((m) => ({
        default: m.HtmlMinifier,
      })),
    { loading },
  ),
  "text-diff": dynamic(
    () =>
      import("@/tools/text/text-diff").then((m) => ({
        default: m.TextDiff,
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
  "csv-to-json": dynamic(
    () =>
      import("@/tools/data/csv-to-json").then((m) => ({
        default: m.CsvToJsonTool,
      })),
    { loading },
  ),
  "json-to-csv": dynamic(
    () =>
      import("@/tools/data/json-to-csv").then((m) => ({
        default: m.JsonToCsvTool,
      })),
    { loading },
  ),
  "csv-to-xml": dynamic(
    () =>
      import("@/tools/data/csv-to-xml").then((m) => ({
        default: m.CsvToXmlTool,
      })),
    { loading },
  ),
  "xml-to-json": dynamic(
    () =>
      import("@/tools/data/xml-to-json").then((m) => ({
        default: m.XmlToJsonTool,
      })),
    { loading },
  ),
  "json-to-xml": dynamic(
    () =>
      import("@/tools/data/json-to-xml").then((m) => ({
        default: m.JsonToXmlTool,
      })),
    { loading },
  ),
  "json-to-toml": dynamic(
    () =>
      import("@/tools/data/json-to-toml").then((m) => ({
        default: m.JsonToTomlTool,
      })),
    { loading },
  ),
  "toml-to-json": dynamic(
    () =>
      import("@/tools/data/toml-to-json").then((m) => ({
        default: m.TomlToJsonTool,
      })),
    { loading },
  ),
  "json-to-url-query": dynamic(
    () =>
      import("@/tools/data/json-to-url-query").then((m) => ({
        default: m.JsonToUrlQueryTool,
      })),
    { loading },
  ),
  "url-query-to-json": dynamic(
    () =>
      import("@/tools/data/url-query-to-json").then((m) => ({
        default: m.UrlQueryToJsonTool,
      })),
    { loading },
  ),
  "json-to-json-schema": dynamic(
    () =>
      import("@/tools/data/json-to-json-schema").then((m) => ({
        default: m.JsonToJsonSchemaTool,
      })),
    { loading },
  ),
  "json-to-sql": dynamic(
    () =>
      import("@/tools/data/json-to-sql").then((m) => ({
        default: m.JsonToSqlTool,
      })),
    { loading },
  ),
  "json-to-yaml": dynamic(
    () =>
      import("@/tools/data/json-to-yaml").then((m) => ({
        default: m.JsonToYamlTool,
      })),
    { loading },
  ),
  "yaml-to-json": dynamic(
    () =>
      import("@/tools/data/yaml-to-json").then((m) => ({
        default: m.YamlToJsonTool,
      })),
    { loading },
  ),

  // ── Phase 6 additions ─────────────────────────────────
  "jpg-to-png": dynamic(
    () =>
      import("@/tools/image/jpg-to-png").then((m) => ({ default: m.JpgToPng })),
    { loading },
  ),
  "crop-image": dynamic(
    () =>
      import("@/tools/image/crop-image").then((m) => ({ default: m.CropImage })),
    { loading },
  ),
  "image-watermark": dynamic(
    () =>
      import("@/tools/image/image-watermark").then((m) => ({
        default: m.ImageWatermark,
      })),
    { loading },
  ),
  "images-to-pdf": dynamic(
    () =>
      import("@/tools/pdf/images-to-pdf").then((m) => ({
        default: m.ImagesToPdf,
      })),
    { loading },
  ),
  "pdf-to-text": dynamic(
    () =>
      import("@/tools/pdf/pdf-to-text").then((m) => ({
        default: m.PdfToText,
      })),
    { loading },
  ),
  "json-validator": dynamic(
    () =>
      import("@/tools/developer/json-validator").then((m) => ({
        default: m.JsonValidator,
      })),
    { loading },
  ),
  "json-diff": dynamic(
    () =>
      import("@/tools/developer/json-diff").then((m) => ({
        default: m.JsonDiff,
      })),
    { loading },
  ),
  "password-generator": dynamic(
    () =>
      import("@/tools/developer/password-generator").then((m) => ({
        default: m.PasswordGenerator,
      })),
    { loading },
  ),
  "hmac-generator": dynamic(
    () =>
      import("@/tools/developer/hmac-generator").then((m) => ({
        default: m.HmacGenerator,
      })),
    { loading },
  ),
  "sort-lines": dynamic(
    () =>
      import("@/tools/text/sort-lines").then((m) => ({
        default: m.SortLines,
      })),
    { loading },
  ),
  "remove-duplicate-lines": dynamic(
    () =>
      import("@/tools/text/remove-duplicate-lines").then((m) => ({
        default: m.RemoveDuplicateLines,
      })),
    { loading },
  ),
  "find-and-replace": dynamic(
    () =>
      import("@/tools/text/find-and-replace").then((m) => ({
        default: m.FindAndReplace,
      })),
    { loading },
  ),
  "html-encode-decode": dynamic(
    () =>
      import("@/tools/text/html-encode-decode").then((m) => ({
        default: m.HtmlEncodeDecode,
      })),
    { loading },
  ),
  "lorem-ipsum": dynamic(
    () =>
      import("@/tools/text/lorem-ipsum").then((m) => ({
        default: m.LoremIpsum,
      })),
    { loading },
  ),
  "timezone-converter": dynamic(
    () =>
      import("@/tools/datetime/timezone-converter").then((m) => ({
        default: m.TimezoneConverter,
      })),
    { loading },
  ),
  "date-difference": dynamic(
    () =>
      import("@/tools/datetime/date-difference").then((m) => ({
        default: m.DateDifference,
      })),
    { loading },
  ),
  "age-calculator": dynamic(
    () =>
      import("@/tools/datetime/age-calculator").then((m) => ({
        default: m.AgeCalculator,
      })),
    { loading },
  ),
  "base-converter": dynamic(
    () =>
      import("@/tools/converters/base-converter").then((m) => ({
        default: m.BaseConverter,
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
