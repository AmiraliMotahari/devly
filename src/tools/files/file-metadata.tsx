"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Calendar, FileIcon, FileType, Hash, Trash2, Upload } from "lucide-react";
import { useState } from "react";

interface FileInfo {
  id: string;
  file: File;
}

function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return "(no extension)";
  return name.slice(lastDot + 1);
}

function getFileTypeFromMime(mime: string): string {
  if (!mime || mime === "application/octet-stream") return "Unknown";
  const [category, subtype] = mime.split("/");
  if (category === "image") return "Image";
  if (category === "video") return "Video";
  if (category === "audio") return "Audio";
  if (category === "text") return "Text";
  if (category === "application") {
    if (subtype.includes("pdf")) return "PDF Document";
    if (subtype.includes("zip")) return "Archive";
    if (subtype.includes("json")) return "JSON Data";
    if (subtype.includes("xml")) return "XML Data";
    if (subtype.includes("word")) return "Word Document";
    if (subtype.includes("excel") || subtype.includes("spreadsheet"))
      return "Spreadsheet";
    if (subtype.includes("powerpoint") || subtype.includes("presentation"))
      return "Presentation";
    return "Application";
  }
  return mime;
}

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function FileMetadata({}: ToolComponentProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);

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

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => document.getElementById("file-metadata-input")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            document.getElementById("file-metadata-input")?.click();
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
          id="file-metadata-input"
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
        <div className="flex flex-col gap-4">
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.file.type || "Unknown type"}
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <FileType className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        File type
                      </p>
                      <p className="text-sm">
                        {getFileTypeFromMime(file.file.type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        File size
                      </p>
                      <p className="text-sm">
                        {formatFileSize(file.file.size)} ({file.file.size.toLocaleString()} bytes)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileType className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        MIME type
                      </p>
                      <p className="text-sm break-all">
                        {file.file.type || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileType className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Extension
                      </p>
                      <p className="text-sm">
                        .{getFileExtension(file.file.name)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 sm:col-span-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Last modified
                      </p>
                      <p className="text-sm">
                        {formatDate(new Date(file.file.lastModified))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}