"use client";

import { ResultPanel } from "@/components/result-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import { loadPdfjs } from "./pdfjs";
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

export function PdfToText({ tool }: ToolComponentProps) {
  void tool;
  const [pdf, setPdf] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: FileList) => {
    const file = Array.from(files).find(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (file) {
      setPdf(file);
      setText(null);
      setError(null);
    }
  };

  const handleExtract = useCallback(async () => {
    if (!pdf) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const pdfjsLib = await loadPdfjs();

      const bytes = await pdf.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const doc = await loadingTask.promise;

      const parts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        setProgress(Math.round((i / doc.numPages) * 90));
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // Rebuild lines using Y positions so paragraphs survive extraction
        let lastY: number | null = null;
        let line = "";
        const lines: string[] = [];
        for (const item of content.items as Array<{ str: string; transform: number[] }>) {
          const y = Math.round(item.transform[5]);
          if (lastY !== null && Math.abs(y - lastY) > 2) {
            lines.push(line.trim());
            line = "";
          }
          line += item.str;
          if (!item.str.endsWith(" ")) line += " ";
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());
        parts.push(
          `--- Page ${i} ---\n${lines.filter((l) => l.length > 0).join("\n")}`,
        );
      }

      setProgress(100);
      setText(parts.join("\n\n"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract text from PDF.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [pdf]);

  const handleProcessAnother = () => {
    setText(null);
    setPdf(null);
    setError(null);
    setProgress(0);
  };

  const result: ToolResult | null = text
    ? {
        filename: pdf ? pdf.name.replace(/\.pdf$/i, "") + ".txt" : "extracted.txt",
        blob: new Blob([text], { type: "text/plain" }),
        outputSize: new Blob([text]).size,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      {text === null && (
        <>
          <div>
            <Label htmlFor="pdf2txt-upload" className="sr-only">
              Upload PDF
            </Label>
            <label
              htmlFor="pdf2txt-upload"
              className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <Upload className="mb-3 size-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop a PDF here or click to browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Text is extracted locally — nothing is uploaded
              </p>
              <input
                id="pdf2txt-upload"
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files?.length) handleFile(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {pdf && (
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <FileText className="size-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pdf.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pdf.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setPdf(null)}
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </Button>
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
                  <Loader2 className="size-4 animate-spin" />
                  Extracting text...
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
              disabled={!pdf}
              onClick={handleExtract}
            >
              <Play data-icon="inline-start" />
              Extract Text
            </Button>
          )}
        </>
      )}

      {result && (
        <ResultPanel
          results={[result]}
          onProcessAnother={handleProcessAnother}
        />
      )}
    </div>
  );
}
