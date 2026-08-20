"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize, sanitizeFilename } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import JSZip from "jszip";
import {
  AlertCircle,
  Download,
  FileIcon,
  Loader2,
  Upload,
  X
} from "lucide-react";
import { useCallback, useState } from "react";

export function ExtractZip({ tool }: ToolComponentProps) {
  void tool;
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) =>
      f.name.toLowerCase().endsWith(".zip"),
    );
    if (file) setZipFile(file);
  };

  const handleExtract = useCallback(async () => {
    if (!zipFile) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const buffer = await zipFile.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const entries = Object.values(zip.files).filter((e) => !e.dir);
      if (entries.length === 0) {
        throw new Error("The ZIP archive is empty.");
      }
      const allResults: ToolResult[] = [];
      for (let i = 0; i < entries.length; i++) {
        setProgress(Math.round((i / entries.length) * 90));
        const entry = entries[i];
        const safeName = sanitizeFilename(
          entry.name.split("/").pop() || "file",
        );
        const blob = await entry.async("blob");
        allResults.push({ filename: safeName, blob, outputSize: blob.size });
      }
      setProgress(100);
      setResults(allResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract ZIP.");
    } finally {
      setIsProcessing(false);
    }
  }, [zipFile]);

  const handleProcessAnother = () => {
    setResults([]);
    setZipFile(null);
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
    a.download = "extracted-files.zip";
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
      {!zipFile ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a ZIP file"
          onClick={() => document.getElementById("extract-zip-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("extract-zip-input")?.click();
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
            Drop a ZIP file here or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ZIP archives only
          </p>
          <input
            id="extract-zip-input"
            type="file"
            accept=".zip,application/zip"
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
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{zipFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(zipFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZipFile(null)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
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
              <Loader2 className="h-4 w-4 animate-spin" /> Extracting...
            </span>
            <span className="tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        zipFile && (
          <Button size="lg" className="w-full" onClick={handleExtract}>
            <Download className="mr-2 h-4 w-4" /> Extract ZIP
          </Button>
        )
      )}
    </div>
  );
}
