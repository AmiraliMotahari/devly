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
import { AlertCircle, FileText, Loader2, Play, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
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
      const pages = doc.getPages();
      const zip = new JSZip();
      const baseName = pdf.name.replace(/\.pdf$/i, "");
      const allResults: ToolResult[] = [];
      let imageCount = 0;

      for (let i = 0; i < pages.length; i++) {
        setProgress(Math.round((i / pages.length) * 90));
        const page = pages[i];
        const { height } = page.getSize();
        const xobjects = page.node.get(PDFDocument.name || "Resources")?.get("XObject");
        if (!xobjects) continue;

        const xobjectMap = xobjects.dict?.asMap();
        if (!xobjectMap) continue;

        for (const [name, ref] of Object.entries(xobjectMap)) {
          const xobj = doc.getObjectByRef(ref);
          if (!xobj || xobj.get("Subtype")?.toString() !== "/Image") continue;

          imageCount++;
          const subtype = xobj.get("Subtype");
          const width = xobj.get("Width")?.toString() || "0";
          const height2 = xobj.get("Height")?.toString() || "0";
          const filter = xobj.get("Filter")?.toString() || "";

          let blob: Blob;
          let ext = "png";

          try {
            if (filter.includes("DCTDecode")) {
              ext = "jpg";
              const imageBytes = xobj.getBytes();
              blob = new Blob([imageBytes], { type: "image/jpeg" });
            } else if (filter.includes("FlateDecode")) {
              ext = "png";
              const imageBytes = xobj.getBytes();
              const colorSpace = xobj.get("ColorSpace")?.toString() || "";
              const bpc = parseInt(xobj.get("BitsPerComponent")?.toString() || "8", 10);

              if (colorSpace.includes("DeviceRGB") || colorSpace.includes("CalRGB")) {
                const canvas = document.createElement("canvas");
                canvas.width = parseInt(width, 10);
                canvas.height = parseInt(height2, 10);
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Could not get canvas context");

                const imgData = ctx.createImageData(parseInt(width, 10), parseInt(height2, 10));
                imgData.data.set(new Uint8ClampedArray(imageBytes));
                ctx.putImageData(imgData, 0, 0);
                blob = await new Promise<Blob>((resolve, reject) => {
                  canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error("Conversion failed"))),
                    "image/png",
                  );
                });
              } else {
                const imageBytes = xobj.getBytes();
                blob = new Blob([imageBytes], { type: "image/png" });
              }
            } else {
              const imageBytes = xobj.getBytes();
              blob = new Blob([imageBytes], { type: "image/png" });
            }
          } catch {
            const imageBytes = xobj.getBytes();
            blob = new Blob([imageBytes], { type: "application/octet-stream" });
            ext = "bin";
          }

          const filename = `${baseName}_img_${imageCount}_p${i + 1}.${ext}`;
          zip.file(filename, blob);
          allResults.push({ filename, blob, outputSize: blob.size });
        }
      }

      if (allResults.length === 0) {
        setError("No images found in this PDF.");
        setIsProcessing(false);
        return;
      }

      setProgress(95);
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
      const message = err instanceof Error ? err.message : "Failed to extract images.";
      setError(message);
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
    <div className="space-y-6">
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
              <Loader2 className="h-4 w-4 animate-spin" /> Extracting images...
            </span>
            <span className="tabular-nums text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : (
        pdf && (
          <Button size="lg" className="w-full" onClick={handleExtract}>
            <Play className="mr-2 h-4 w-4" /> Extract Images
          </Button>
        )
      )}
    </div>
  );
}
