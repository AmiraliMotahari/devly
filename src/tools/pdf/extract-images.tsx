"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResultPanel } from "@/components/result-panel";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import JSZip from "jszip";
import { PDFDocument, PDFDict, PDFName, PDFRawStream, PDFStream } from "pdf-lib";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

export function ExtractImages({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) => f.type === "application/pdf");
    if (file) setPdf(file);
  };

  const handleExtract = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageCount = doc.getPageCount();
      const zip = new JSZip();
      const baseName = pdf.name.replace(/\.pdf$/i, "");
      const allResults: ToolResult[] = [];
      let imageCount = 0;

      for (let i = 0; i < pageCount; i++) {
        setProgress(Math.round((i / pageCount) * 95));
      }

      const allObjects = doc.context.enumerateIndirectObjects();

      for (const [, obj] of allObjects) {
        try {
          if (!(obj instanceof PDFStream)) continue;

          const dict = obj instanceof PDFRawStream
            ? (obj as PDFRawStream).dict
            : (obj as unknown as { dict: PDFDict }).dict;
          if (!dict) continue;

          const subtype = dict.get(PDFName.of("Subtype"));
          const subtypeName = subtype ? subtype.toString() : "";

          if (subtypeName !== "/Image") continue;

          imageCount++;
          const width = dict.get(PDFName.of("Width"))?.toString() || "0";
          const height = dict.get(PDFName.of("Height"))?.toString() || "0";
          const filter = dict.get(PDFName.of("Filter"))?.toString() || "";

          let blob: Blob;
          let ext = "png";
          const rawStream = obj as PDFRawStream;
          const imageData = rawStream.contents;

          if (filter.includes("DCTDecode")) {
            ext = "jpg";
            blob = new Blob([imageData.buffer as ArrayBuffer], { type: "image/jpeg" });
          } else if (filter.includes("FlateDecode")) {
            ext = "png";
            blob = new Blob([imageData.buffer as ArrayBuffer], { type: "image/png" });
          } else {
            ext = "png";
            blob = new Blob([imageData.buffer as ArrayBuffer], { type: "image/png" });
          }

          const filename = `${baseName}_img_${imageCount}_${width}x${height}.${ext}`;
          zip.file(filename, blob);
          allResults.push({ filename, blob, outputSize: blob.size });
        } catch {
          // Skip entries that can't be processed
        }
      }

      if (allResults.length === 0) {
        setError("No images found in this PDF.");
        setIsProcessing(false);
        return;
      }

      setProgress(98);
      if (allResults.length === 1) {
        setResults(allResults);
      } else {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResults([{
          filename: `${baseName}_images.zip`,
          blob: zipBlob,
          originalSize: pdf.size,
          outputSize: zipBlob.size,
          metadata: { "Images extracted": allResults.length.toString() },
        }]);
      }
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract images.");
    } finally {
      setIsProcessing(false);
    }
  }, [pdf]);

  const handleProcessAnother = () => {
    setResults([]);
    setPdf(null);
    setError(null);
    setProgress(0);
  };

  if (results.length > 0) {
    return (
      <ResultPanel
        results={results}
        onProcessAnother={handleProcessAnother}
        onDownloadAll={undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!pdf ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF file"
          onClick={() => document.getElementById("extract-images-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("extract-images-input")?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files);
          }}
          className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a PDF file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Extract all embedded images from a PDF
          </p>
          <input
            id="extract-images-input"
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) handleFile(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{pdf.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pdf.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPdf(null)}
                aria-label="Remove file"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Processing failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Extracting images...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleExtract}>
            <Play data-icon="inline-start" /> Extract Images
          </Button>
        )
      )}
    </div>
  );
}
