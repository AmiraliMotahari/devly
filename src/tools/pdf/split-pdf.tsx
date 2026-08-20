"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import JSZip from "jszip";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useState } from "react";

function parseRanges(input: string, maxPages: number): number[][] {
  const ranges: number[][] = [];
  const parts = input.split(",").map((p) => p.trim());
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match)
      throw new Error(
        `Invalid range: "${part}". Use format like 1-3, 5, 8-10.`,
      );
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    if (start < 1 || end > maxPages || start > end) {
      throw new Error(
        `Range "${part}" is out of bounds (document has ${maxPages} pages).`,
      );
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i - 1);
    ranges.push(pages);
  }
  return ranges;
}

export function SplitPdf({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [mode, setMode] = useState("ranges");
  const [ranges, setRanges] = useState("1-3, 5, 8-10");
  const [interval, setInterval] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) => f.type === "application/pdf");
    if (file) setPdf(file);
  };

  const handleSplit = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const totalPages = doc.getPageCount();

      let splitPlans: number[][] = [];
      if (mode === "ranges") {
        splitPlans = parseRanges(ranges, totalPages);
      } else if (mode === "each") {
        for (let i = 0; i < totalPages; i++) splitPlans.push([i]);
      } else if (mode === "interval") {
        const step = Math.max(1, interval);
        for (let i = 0; i < totalPages; i += step) {
          const pages: number[] = [];
          for (let j = i; j < Math.min(i + step, totalPages); j++)
            pages.push(j);
          splitPlans.push(pages);
        }
      }

      const allResults: ToolResult[] = [];
      const baseName = pdf.name.replace(/\.pdf$/i, "");

      for (let i = 0; i < splitPlans.length; i++) {
        const pages = splitPlans[i];
        setProgress(Math.round((i / splitPlans.length) * 90));
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(doc, pages);
        copiedPages.forEach((page) => newDoc.addPage(page));
        const newBytes = await newDoc.save();
        const buffer = new Uint8Array(newBytes);
        const blob = new Blob([buffer], { type: "application/pdf" });
        const pageLabel =
          pages.length === 1
            ? `page-${pages[0] + 1}`
            : `pages-${pages[0] + 1}-${pages[pages.length - 1] + 1}`;
        allResults.push({
          filename: `${baseName}_${pageLabel}.pdf`,
          blob,
          outputSize: blob.size,
        });
      }

      setProgress(100);
      setResults(allResults);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to split PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdf, mode, ranges, interval]);

  const handleProcessAnother = () => {
    setResults([]);
    setPdf(null);
    setError(null);
    setProgress(0);
  };

  const handleDownloadAll = useCallback(async () => {
    const zip = new JSZip();
    for (const result of results) {
      zip.file(result.filename, result.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "split-pdf-results.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results]);

  if (results.length > 0) {
    return (
      <ResultPanel
        results={results}
        onProcessAnother={handleProcessAnother}
        onDownloadAll={results.length > 1 ? handleDownloadAll : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!pdf ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF file"
          onClick={() => document.getElementById("split-pdf-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("split-pdf-input")?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0)
              handleFile(e.dataTransfer.files);
          }}
          className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop a PDF file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Single PDF file</p>
          <input
            id="split-pdf-input"
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
                <label className="text-sm font-medium">Split mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ranges">Page ranges</option>
                  <option value="each">Each page separately</option>
                  <option value="interval">Every N pages</option>
                </select>
              </div>

              {mode === "ranges" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Page ranges (e.g. 1-3, 5, 8-10)
                  </label>
                  <input
                    type="text"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    placeholder="1-3, 5, 8-10"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              {mode === "interval" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pages per file</label>
                  <input
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
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
              <Loader2 className="h-4 w-4 animate-spin" />
              Splitting PDF...
            </span>
            <span className="tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleSplit}>
            <Play className="mr-2 h-4 w-4" />
            Split PDF
          </Button>
        )
      )}
    </div>
  );
}
