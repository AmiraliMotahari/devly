"use client";

import { useState, useCallback } from "react";
import { Loader2, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { UploadZone, type UploadedFile } from "@/components/upload-zone";
import { ResultPanel } from "@/components/result-panel";
import { detectMimeType, sanitizeFilename } from "@/lib/file-security";
import type {
  ToolDefinition,
  ToolResult,
  ProcessingContext,
} from "@/types/tool";
import JSZip from "jszip";
import { appName } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";

interface ToolRunnerProps {
  tool: ToolDefinition;
  processor: (
    input: File | string,
    options: Record<string, number | string | boolean>,
    ctx: ProcessingContext,
  ) => Promise<ToolResult | ToolResult[]>;
}

export function ToolRunner({ tool, processor }: ToolRunnerProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [options, setOptions] = useState<
    Record<string, number | string | boolean>
  >(() => {
    const defaults: Record<string, number | string | boolean> = {};
    tool.options?.forEach((opt) => {
      defaults[opt.key] = opt.default;
    });
    return defaults;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const validFiles = files.filter((f) => f.status === "valid");

  const handleProcess = useCallback(async () => {
    if (validFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setResults([]);

    const controller = new AbortController();
    setAbortController(controller);

    const ctx: ProcessingContext = {
      jobId: Math.random().toString(36).slice(2),
      signal: controller.signal,
      onProgress: (percent, label) => {
        setProgress(percent);
        if (label) setProgressLabel(label);
      },
    };

    try {
      const allResults: ToolResult[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const uploaded = validFiles[i];
        ctx.onProgress(
          Math.round((i / validFiles.length) * 100),
          `Processing ${uploaded.file.name} (${i + 1}/${validFiles.length})`,
        );

        const detectedMime = await detectMimeType(uploaded.file);
        const file = new File(
          [uploaded.file],
          sanitizeFilename(uploaded.file.name),
          {
            type: detectedMime,
          },
        );

        const result = await processor(file, options, ctx);
        const resultArray = Array.isArray(result) ? result : [result];
        allResults.push(...resultArray);
      }
      ctx.onProgress(100, "Done");
      setResults(allResults);
    } catch (err) {
      if (controller.signal.aborted) {
        setError("Processing was cancelled.");
      } else {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
      }
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  }, [validFiles, options, processor]);

  const handleCancel = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  const handleProcessAnother = useCallback(() => {
    setResults([]);
    setFiles([]);
    setError(null);
    setProgress(0);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    const zip = new JSZip();
    for (const result of results) {
      zip.file(result.filename, result.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${appName}-results.zip`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results]);

  const canProcess = validFiles.length > 0 && !isProcessing;

  return (
    <div className="space-y-6">
      {results.length === 0 && (
        <>
          <UploadZone
            accept={tool.acceptFileTypes?.join(",")}
            multiple={tool.supportsBatch}
            maxFiles={tool.maxFiles ?? 100}
            maxFileSizeMB={tool.maxFileSizeMB ?? 50}
            files={files}
            onFilesChange={setFiles}
            hint={
              tool.acceptFileTypes && tool.acceptFileTypes.length > 0
                ? `Supported: ${tool.acceptFileTypes.join(", ")}`
                : undefined
            }
          />

          {tool.options && tool.options.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-semibold">Options</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {tool.options.map((opt) => (
                    <div key={opt.key} className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`opt-${opt.key}`}
                      >
                        {opt.label}
                      </label>
                      {opt.type === "slider" && (
                        <div className="flex items-center gap-3">
                          <input
                            id={`opt-${opt.key}`}
                            type="range"
                            min={opt.min}
                            max={opt.max}
                            step={opt.step}
                            value={Number(options[opt.key])}
                            onChange={(e) =>
                              setOptions((prev) => ({
                                ...prev,
                                [opt.key]: Number(e.target.value),
                              }))
                            }
                            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                          />
                          <span className="w-12 text-right text-sm font-medium tabular-nums">
                            {options[opt.key]}
                          </span>
                        </div>
                      )}
                      {opt.type === "select" && (
                        <select
                          id={`opt-${opt.key}`}
                          value={String(options[opt.key])}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              [opt.key]: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {opt.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {opt.type === "switch" && (
                        <button
                          id={`opt-${opt.key}`}
                          role="switch"
                          aria-checked={Boolean(options[opt.key])}
                          onClick={() =>
                            setOptions((prev) => ({
                              ...prev,
                              [opt.key]: !prev[opt.key],
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            options[opt.key] ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                              options[opt.key]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      )}
                      {opt.type === "number" && (
                        <input
                          id={`opt-${opt.key}`}
                          type="number"
                          min={opt.min}
                          max={opt.max}
                          step={opt.step}
                          value={Number(options[opt.key])}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              [opt.key]: Number(e.target.value),
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      )}
                      {opt.type === "text" && (
                        <input
                          id={`opt-${opt.key}`}
                          type="text"
                          value={String(options[opt.key])}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              [opt.key]: e.target.value,
                            }))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      )}
                      {opt.help && (
                        <p className="text-xs text-muted-foreground">
                          {opt.help}
                        </p>
                      )}
                    </div>
                  ))}
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
                  {progressLabel || "Processing..."}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} />
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={!canProcess}
              onClick={handleProcess}
            >
              <Play className="mr-2 h-4 w-4" />
              {validFiles.length > 1
                ? `Process ${validFiles.length} files`
                : "Process"}
            </Button>
          )}
        </>
      )}

      {results.length > 0 && (
        <ResultPanel
          results={results}
          onProcessAnother={handleProcessAnother}
          onDownloadAll={results.length > 1 ? handleDownloadAll : undefined}
        />
      )}
    </div>
  );
}


type ToolRunnerSkeletonProps= {
  showOptions?: boolean;
}

export function ToolRunnerSkeleton({
  showOptions = true,
}: ToolRunnerSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Skeleton className="mb-4 h-12 w-12 rounded-lg" />

          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />

          <Skeleton className="mt-4 h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Options */}
      {showOptions && (
        <div className="rounded-xl border bg-card">
          <div className="p-6">
            <Skeleton className="mb-5 h-4 w-16" />

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Option 1 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>

              {/* Option 2 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>

              {/* Option 3 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>

              {/* Option 4 */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process button */}
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}
