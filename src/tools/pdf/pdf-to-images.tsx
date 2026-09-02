"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResultPanel } from "@/components/result-panel";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import JSZip from "jszip";
import { loadPdfjs } from "./pdfjs";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

export function PdfToImages({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [format, setFormat] = useState("png");
  const [dpi, setDpi] = useState("150");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) => f.type === "application/pdf");
    if (file) setPdf(file);
  };

  const handleConvert = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const bytes = await pdf.arrayBuffer();
      const pdfjsLib = await loadPdfjs();

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const scale = parseInt(dpi, 10) / 72;
      const allResults: ToolResult[] = [];

      const zip = new JSZip();
      const baseName = pdf.name.replace(/\.pdf$/i, "");

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 90));
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        await page.render({
          canvas,
          canvasContext: ctx,
          viewport,
        }).promise;

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const quality = format === "jpeg" ? 0.92 : undefined;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Canvas conversion failed"))),
            mimeType,
            quality,
          );
        });

        const filename = `${baseName}_page_${i}.${format}`;
        zip.file(filename, blob);
        allResults.push({ filename, blob, outputSize: blob.size });
      }

      if (allResults.length === 1) {
        setResults(allResults);
      } else {
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResults([{
          filename: `${baseName}_pages.zip`,
          blob: zipBlob,
          originalSize: pdf.size,
          outputSize: zipBlob.size,
          metadata: { Pages: numPages.toString(), Format: format.toUpperCase() },
        }]);
      }
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to convert PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdf, format, dpi]);

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
          onClick={() => document.getElementById("pdf-to-images-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("pdf-to-images-input")?.click();
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
            Single PDF file, each page becomes an image
          </p>
          <input
            id="pdf-to-images-input"
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

            <div className="mt-4 flex gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="pdf-img-format" className="text-sm font-medium">Format</label>
<Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="pdf-img-format" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="pdf-img-dpi" className="text-sm font-medium">Quality</label>
<Select value={dpi} onValueChange={setDpi}>
                  <SelectTrigger id="pdf-img-dpi" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="72">72 DPI (screen)</SelectItem>
                    <SelectItem value="150">150 DPI (standard)</SelectItem>
                    <SelectItem value="300">300 DPI (print)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Loader2 className="h-4 w-4 animate-spin" /> Converting pages...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleConvert}>
            <Play data-icon="inline-start" /> Convert to Images
          </Button>
        )
      )}
    </div>
  );
}
