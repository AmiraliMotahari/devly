"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ResultPanel } from "@/components/result-panel";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Loader2, Play, Upload, X, FileIcon } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadedFile {
  id: string;
  file: File;
}

export function CreateEncryptedZip({}: ToolComponentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ filename: string; blob: Blob }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCreate = useCallback(async () => {
    if (files.length === 0) {
      setError("Please select files to add to the archive");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password to encrypt the ZIP");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        setProgress(Math.round((i / files.length) * 90));
        const buffer = await files[i].file.arrayBuffer();
        zip.file(files[i].file.name, buffer);
      }

      setProgress(95);
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9,
        },
        password: password,
      });

      setResults([{ filename: "secure.zip", blob }]);
      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to create encrypted ZIP: ${err.message}`
          : "Failed to create encrypted ZIP",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [files, password]);

  const handleProcessAnother = () => {
    setResults([]);
    setFiles([]);
    setError(null);
    setProgress(0);
    setPassword("");
  };

  if (results.length > 0) {
    return (
      <ResultPanel
        results={results.map((r) => ({
          filename: r.filename,
          blob: r.blob,
          outputSize: r.blob.size,
        }))}
        onProcessAnother={handleProcessAnother}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() =>
          document.getElementById("create-encrypted-zip-input")?.click()
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("create-encrypted-zip-input")?.click();
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
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Any file type, up to 200 files
        </p>
        <input
          id="create-encrypted-zip-input"
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold">{files.length} files</h3>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(f.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(f.id)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password for encryption"
            className="w-full"
          />
          <span className="ml-2 text-xs text-muted-foreground">
            Case-sensitive, required for extraction
          </span>
        </Label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Creating encrypted
              ZIP...
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
          disabled={files.length === 0 || !password.trim()}
          onClick={handleCreate}
        >
          <Play className="mr-2 h-4 w-4" /> Create Password ZIP
        </Button>
      )}
    </div>
  );
}
