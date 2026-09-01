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
import { AlertCircle, GripVertical, Image as ImageIcon, Loader2, Play, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useState } from "react";

interface ImageFile {
  id: string;
  file: File;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImagesToPdf({ tool }: ToolComponentProps) {
  void tool;
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFiles = (files: FileList) => {
    const incoming: ImageFile[] = Array.from(files)
      .filter((f) => ACCEPTED.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name))
      .map((f) => ({ id: Math.random().toString(36).slice(2), file: f }));
    if (incoming.length === 0) {
      setError("Please select JPG, PNG, or WebP images.");
      return;
    }
    setError(null);
    setImages((prev) => [...prev, ...incoming]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((p) => p.id !== id));
  };

  const move = (from: number, to: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleCreate = useCallback(async () => {
    if (images.length === 0) {
      setError("Please upload at least one image.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const pdf = await PDFDocument.create();
      for (let i = 0; i < images.length; i++) {
        setProgress(Math.round((i / images.length) * 85));
        const bytes = await images[i].file.arrayBuffer();
        let embedded;
        if (/\.png$/i.test(images[i].file.name) || images[i].file.type === "image/png") {
          embedded = await pdf.embedPng(bytes);
        } else {
          embedded = await pdf.embedJpg(bytes);
        }
        const page = pdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width: embedded.width,
          height: embedded.height,
        });
      }

      setProgress(92);
      const pdfBytes = await pdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      setProgress(100);
      setResults([
        { filename: "images.pdf", blob, outputSize: blob.size },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to create PDF: ${err.message}`
          : "Failed to create PDF.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [images]);

  const handleProcessAnother = () => {
    setResults([]);
    setImages([]);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="img2pdf-upload" className="sr-only">
          Upload images
        </Label>
        <label
          id="img2pdf-upload-label"
          htmlFor="img2pdf-upload"
          className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
        >
          <Upload className="mb-3 size-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop images here or click to browse (JPG, PNG, WebP)
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Each image becomes one page, in the order listed below
          </p>
          <input
            id="img2pdf-upload"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {images.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <p className="text-sm font-medium">
              {images.length} image{images.length === 1 ? "" : "s"} — drag to
              reorder
            </p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null && dragIndex !== idx) move(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{img.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Page {idx + 1} · {formatFileSize(img.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => removeImage(img.id)}
                    aria-label={`Remove ${img.file.name}`}
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
              <Loader2 className="size-4 animate-spin" />
              Creating PDF...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : results.length === 0 ? (
        <Button
          size="lg"
          className="w-full"
          disabled={images.length === 0}
          onClick={handleCreate}
        >
          <Play data-icon="inline-start" />
          {images.length > 1
            ? `Create PDF from ${images.length} images`
            : "Create PDF"}
        </Button>
      ) : null}

      {results.length > 0 && (
        <ResultPanel
          results={results}
          onProcessAnother={handleProcessAnother}
        />
      )}
    </div>
  );
}
