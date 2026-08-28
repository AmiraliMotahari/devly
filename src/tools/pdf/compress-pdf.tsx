"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useState } from "react";

export function CompressPdf({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [level, setLevel] = useState("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find((f) => f.type === "application/pdf");
    if (file) setPdf(file);
  };

  const handleCompress = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(20);
      const bytes = await pdf.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

      setProgress(50);
      doc.setTitle("");
      doc.setAuthor("");
      doc.setSubject("");
      doc.setKeywords([]);
      doc.setProducer("");
      doc.setCreator("");

      setProgress(80);
      const useObjectStreams = level !== "low";
      const compressedBytes = await doc.save({ useObjectStreams });

      setProgress(90);
      const blob = new Blob([compressedBytes], { type: "application/pdf" });

      const savings = ((pdf.size - blob.size) / pdf.size) * 100;
      const savedBytes = pdf.size - blob.size;

      setResults([{
        filename: pdf.name,
        blob,
        originalSize: pdf.size,
        outputSize: blob.size,
        metadata: {
          "Original size": formatFileSize(pdf.size),
          "Compressed size": formatFileSize(blob.size),
          "Space saved": `${formatFileSize(Math.abs(savedBytes))} (${savings.toFixed(1)}%)`,
          "Compression level": level,
        },
      }]);
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to compress PDF.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdf, level]);

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
          onClick={() => document.getElementById("compress-pdf-input")?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("compress-pdf-input")?.click();
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
            id="compress-pdf-input"
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

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Compression Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="low">Low (best quality)</option>
                <option value="medium">Medium (balanced)</option>
                <option value="high">High (smallest size)</option>
              </select>
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
              <Loader2 className="h-4 w-4 animate-spin" /> Compressing PDF...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleCompress}>
            <Play className="mr-2 h-4 w-4" /> Compress PDF
          </Button>
        )
      )}
    </div>
  );
}
