"use client";

import { Button } from "@/components/ui/button";
import { CopyToClipboard } from "@/components/copy-to-clipboard";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/lib/file-security";
import { CodeBlock } from "@/components/code-block";
import type { ToolComponentProps } from "@/tools/tool-props";
import { type FileHashes, type HashAlgorithm, computeFileHashes } from "./processing/pipeline";
import { FileIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadedFile {
  id: string;
  file: File;
  hashes: FileHashes | null;
  isProcessing: boolean;
}

export function ChecksumGenerator({}: ToolComponentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("all");

  const handleFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      hashes: null,
      isProcessing: false,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processFile = useCallback(async (file: UploadedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, isProcessing: true } : f))
    );

    try {
      const hashes = await computeFileHashes(
        file.file,
        algorithm as HashAlgorithm,
      );

      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, hashes, isProcessing: false } : f))
      );
    } catch {
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, isProcessing: false } : f))
      );
    }
  }, [algorithm]);

  const processAll = useCallback(async () => {
    for (const file of files.filter((f) => !f.hashes && !f.isProcessing)) {
      await processFile(file);
    }
  }, [files, processFile]);

  const hashesText = (file: UploadedFile): string => {
    if (!file.hashes) return "";
    const text = Object.entries(file.hashes)
      .map(([algo, hash]) => `${algo.toUpperCase()}: ${hash}`)
      .join("\n");
    return `${file.file.name}:\n${text}`;
  };

  const allProcessed = files.every((f) => f.hashes || f.isProcessing);

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => document.getElementById("checksum-input")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("checksum-input")?.click();
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
          Any file type, up to 50 files
        </p>
        <input
          id="checksum-input"
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="checksum-algorithm" className="text-sm font-medium">
            Algorithm
          </label>
          <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as HashAlgorithm)}>
            <SelectTrigger id="checksum-algorithm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All algorithms</SelectItem>
              <SelectItem value="md5">MD5</SelectItem>
              <SelectItem value="sha1">SHA-1</SelectItem>
              <SelectItem value="sha256">SHA-256</SelectItem>
              <SelectItem value="sha384">SHA-384</SelectItem>
              <SelectItem value="sha512">SHA-512</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {files.length > 0 && !allProcessed && (
          <Button onClick={processAll} disabled={files.some((f) => f.isProcessing)}>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generate All Checksums
          </Button>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(file.id)}
                    aria-label="Remove file"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {file.isProcessing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Computing hashes...
                  </div>
                )}

                {file.hashes && (
                  <div className="flex flex-col gap-2">
                    {Object.entries(file.hashes).map(([algo, hash]) => (
                      <div key={algo} className="flex items-center gap-2">
                        <span className="w-20 text-xs font-medium text-muted-foreground">
                          {algo.toUpperCase()}
                        </span>
                        <CodeBlock code={hash ?? ""} language="text" />
                        <CopyToClipboard
                          value={hash!}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={`Copy ${algo.toUpperCase()} hash`}
                        />
                      </div>
                    ))}
                    <CopyToClipboard
                      value={hashesText(file)}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      showLabel
                      label="Copy All"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}