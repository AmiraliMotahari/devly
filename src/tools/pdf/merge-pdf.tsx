"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import {
  AlertCircle,
  FileText,
  GripVertical,
  Loader2,
  Play,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useState } from "react";

interface PdfFile {
  id: string;
  file: File;
}

export function MergePdf({ tool }: ToolComponentProps) {
  void tool;
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = (files: FileList) => {
    const newPdfs: PdfFile[] = Array.from(files)
      .filter((f) => f.type === "application/pdf")
      .map((f) => ({ id: Math.random().toString(36).slice(2), file: f }));
    setPdfs((prev) => [...prev, ...newPdfs]);
  };

  const removePdf = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
  };

  const handleMerge = useCallback(async () => {
    if (pdfs.length < 2) {
      setError("Please upload at least 2 PDF files to merge.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < pdfs.length; i++) {
        const pdfFile = pdfs[i];
        setProgress(Math.round((i / pdfs.length) * 80));
        const bytes = await pdfFile.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }

      setProgress(90);
      const mergedBytes = await merged.save();
      const blob = new Blob([new Uint8Array(mergedBytes)], { type: "application/pdf" });

      setResults([
        {
          filename: "merged.pdf",
          blob,
          outputSize: blob.size,
        },
      ]);
      setProgress(100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to merge PDFs.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [pdfs]);

  const handleProcessAnother = () => {
    setResults([]);
    setPdfs([]);
    setError(null);
    setProgress(0);
  };

  if (results.length > 0) {
    return (
      <ResultPanel results={results} onProcessAnother={handleProcessAnother} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF files"
        onClick={() => document.getElementById("merge-pdf-input")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("merge-pdf-input")?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length > 0)
            handleFiles(e.dataTransfer.files);
        }}
        className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drop PDF files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          At least 2 PDF files required
        </p>
        <input
          id="merge-pdf-input"
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pdfs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold">
              {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""} — drag to reorder
            </h3>
            <div className="flex flex-col gap-2">
              {pdfs.map((pdf, index) => (
                <div
                  key={pdf.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== index) {
                      const newPdfs = [...pdfs];
                      const [moved] = newPdfs.splice(dragIndex, 1);
                      newPdfs.splice(index, 0, moved);
                      setPdfs(newPdfs);
                    }
                    setDragIndex(null);
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {pdf.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pdf.file.size)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removePdf(pdf.id)}
                    aria-label="Remove file"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
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
              Merging PDFs...
            </span>
            <span className="tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full"
          disabled={pdfs.length < 2}
          onClick={handleMerge}
        >
          <Play data-icon="inline-start" />
          Merge {pdfs.length} PDF{pdfs.length !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
