"use client";

/**
 * Export dialog: format/quality/scale/filename with live preview and
 * multi-file results (split/collage). Uses the shared result patterns.
 */

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatFileSize } from "@/lib/file-security";
import { useObjectUrls } from "@/hooks/use-object-urls";
import type { ExportFormat } from "../types/editor";
import { FORMAT_MIME } from "../processing/export";
import type { ExportResult } from "../processing/export";

export function ExportDialog({
  open,
  onOpenChange,
  canvasWidth,
  canvasHeight,
  transparentBackground,
  onExport,
  busy,
  result,
  onDone,
  initialFilename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasWidth: number;
  canvasHeight: number;
  transparentBackground: boolean;
  onExport: (config: { format: ExportFormat; quality: number; scale: number; filename: string }) => void;
  busy: boolean;
  result: ExportResult | null;
  onDone: () => void;
  initialFilename: string;
}) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [filename, setFilename] = useState(initialFilename);
  // `key` on the component (set by the parent to the open-session id)
  // remounts fresh state each time the dialog opens.

  const outW = Math.round(canvasWidth * scale);
  const outH = Math.round(canvasHeight * scale);
  const alphaWarning = format === "jpeg" && transparentBackground;

  const run = () => {
    if (!filename.trim()) {
      toast.error("Choose a filename.");
      return;
    }
    onExport({ format, quality, scale, filename });
  };

  const files = result?.files ?? [];
  const previews = useObjectUrls(files.map((f) => f.blob));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-testid="export-dialog">
        <DialogHeader>
          <DialogTitle>Export image</DialogTitle>
          <DialogDescription>
            Preview the result and download. Everything is processed in your browser.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="export-format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger id="export-format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG — lossless, transparency</SelectItem>
                  <SelectItem value="jpeg">JPEG — small, no transparency</SelectItem>
                  <SelectItem value="webp">WebP — modern, transparency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {format !== "png" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="export-quality">Quality</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{quality}</span>
                </div>
                <Slider
                  id="export-quality"
                  value={[quality]}
                  min={10}
                  max={100}
                  onValueChange={([v]) => setQuality(v)}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="export-scale">Size scale</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {outW} × {outH} px
                </span>
              </div>
              <Slider
                id="export-scale"
                value={[scale]}
                min={0.1}
                max={2}
                step={0.05}
                onValueChange={([v]) => setScale(v)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="export-filename">Filename</Label>
              <Input
                id="export-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="edited-image"
              />
            </div>

            {alphaWarning && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground" role="status">
                JPEG can&apos;t store transparency — transparent areas will be filled with white.
              </p>
            )}

            <DialogFooter>
              <Button onClick={run} disabled={busy} data-testid="confirm-export">
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Rendering…
                  </>
                ) : (
                  "Render preview"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {files.length === 1 ? "1 file ready" : `${files.length} files ready`}
              </p>
              <p className="text-xs text-muted-foreground">
                {result.width} × {result.height} px
                {files.length > 0 && ` · ${formatFileSize(files[0].blob.size)}${files.length > 1 ? " each (approx.)" : ""}`}
              </p>
              <div
                className="mt-2 grid max-h-64 gap-3 overflow-y-auto rounded-lg border bg-checker p-3"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg,rgba(0,0,0,0.06) 25%,transparent 25%,transparent 75%,rgba(0,0,0,0.06) 75%),linear-gradient(45deg,rgba(0,0,0,0.06) 25%,transparent 25%,transparent 75%,rgba(0,0,0,0.06) 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 8px 8px",
                }}
                role="group"
                aria-label="Export preview"
              >
                {previews.slice(0, 12).map((p, i) => (
                  // Blob object URLs can't go through next/image optimization.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={files[i].filename}
                    src={p}
                    alt={`Preview of ${files[i].filename}`}
                    className="mx-auto max-h-48 w-auto object-contain"
                  />
                ))}
                {files.length > 12 && (
                  <p className="text-center text-xs text-muted-foreground">
                    + {files.length - 12} more files
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" onClick={onDone} disabled={busy}>
                Back
              </Button>
              <Button
                onClick={() => downloadAll(files)}
                data-testid="download-export"
                autoFocus
              >
                <Download data-icon="inline-start" />
                {files.length > 1 ? `Download ${files.length} files` : "Download"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function downloadAll(files: { filename: string; blob: Blob }[]): void {
  for (const f of files) {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the download a tick to start before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  toast.success(files.length > 1 ? `${files.length} files downloaded` : "Image downloaded");
}

export const EXPORT_FORMAT_MIME = FORMAT_MIME;
