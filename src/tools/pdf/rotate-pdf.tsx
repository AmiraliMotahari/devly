"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import { PDFDocument, degrees } from "pdf-lib";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

export function RotatePdf({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [angle, setAngle] = useState("90");
  const [allPages, setAllPages] = useState(true);
  const [pageRanges, setPageRanges] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) => f.type === "application/pdf");
    if (file) setPdf(file);
  };

  const handleRotate = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(20);
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = doc.getPages();
      const totalPages = pages.length;

      setProgress(40);
      const pagesToRotate: number[] = [];
      if (allPages) {
        for (let i = 0; i < totalPages; i++) pagesToRotate.push(i);
      } else if (pageRanges.trim()) {
        const parts = pageRanges.split(",").map((p) => p.trim());
        for (const part of parts) {
          const match = part.match(/^(\d+)(?:-(\d+))?$/);
          if (!match) throw new Error(`Invalid range: "${part}"`);
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : start;
          if (start < 1 || end > totalPages || start > end) {
            throw new Error(`Range "${part}" is out of bounds (${totalPages} pages)`);
          }
          for (let i = start; i <= end; i++) pagesToRotate.push(i - 1);
        }
      }

      setProgress(60);
      const rotation = parseInt(angle, 10);
      for (let i = 0; i < pagesToRotate.length; i++) {
        const pageIdx = pagesToRotate[i];
        const page = pages[pageIdx];
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + rotation) % 360;
        page.setRotation(degrees(newRotation));
        setProgress(60 + Math.round((i / pagesToRotate.length) * 30));
      }

      setProgress(90);
      const rotatedBytes = await doc.save();
      const blob = new Blob([new Uint8Array(rotatedBytes)], { type: "application/pdf" });

      setResults([{
        filename: pdf.name,
        blob,
        originalSize: pdf.size,
        outputSize: blob.size,
        metadata: {
          "Pages rotated": `${pagesToRotate.length} of ${totalPages}`,
          "Rotation": `${angle}°`,
        },
      }]);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rotate PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdf, angle, allPages, pageRanges]);

  const handleProcessAnother = () => {
    setResults([]);
    setPdf(null);
    setError(null);
    setProgress(0);
  };

  if (results.length > 0) {
    return (
      <ResultPanel results={results} onProcessAnother={handleProcessAnother} />
    );
  }

  return (
    <div className="space-y-6">
      {!pdf ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF file"
          onClick={() => document.getElementById("rotate-pdf-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("rotate-pdf-input")?.click();
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
            Single PDF file, up to 100 MB
          </p>
          <input
            id="rotate-pdf-input"
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
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rotation</label>
                <select
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="90">90° clockwise</option>
                  <option value="180">180°</option>
                  <option value="270">270° clockwise</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  role="switch"
                  aria-checked={allPages}
                  onClick={() => setAllPages(!allPages)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    allPages ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      allPages ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <label className="text-sm font-medium">Apply to all pages</label>
              </div>

              {!allPages && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Page ranges (e.g. 1-3, 5, 8-10)
                  </label>
                  <input
                    type="text"
                    value={pageRanges}
                    onChange={(e) => setPageRanges(e.target.value)}
                    placeholder="1-3, 5, 8-10"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Processing failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Rotating pages...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleRotate}>
            <Play className="mr-2 h-4 w-4" /> Rotate PDF
          </Button>
        )
      )}
    </div>
  );
}
