"use client";

import { ResultPanel } from "@/components/result-panel";
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
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import { splitPdf, friendlyPdfError, zipBlobs } from "./processing/pipeline";
import type { SplitMode } from "./processing/model";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

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
      const allResults = await splitPdf(pdf, mode as SplitMode, ranges, interval, setProgress);
      setResults(allResults);
    } catch (err) {
      setError(friendlyPdfError(err, "Failed to split PDF."));
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
    const blob = await zipBlobs(results);
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
    <div className="flex flex-col gap-6">
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
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="split-mode" className="text-sm font-medium">Split mode</label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="split-mode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ranges">Page ranges</SelectItem>
                    <SelectItem value="each">Each page separately</SelectItem>
                    <SelectItem value="interval">Every N pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "ranges" && (
                <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
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
          <AlertCircle className="size-4" />
          <AlertTitle>Processing failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="flex flex-col gap-3">
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
            <Play data-icon="inline-start" />
            Split PDF
          </Button>
        )
      )}
    </div>
  );
}
