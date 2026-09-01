'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/file-security';
import { Button } from '@/components/ui/button';

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl?: string;
  error?: string;
  status: 'pending' | 'valid' | 'invalid';
}

interface UploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSizeMB?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  label?: string;
  hint?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function UploadZone({
  accept,
  multiple = false,
  maxFiles = 100,
  maxFileSizeMB = 50,
  onFilesChange,
  files,
  label = 'Drop files here or click to browse',
  hint,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (maxFileSizeMB > 0 && file.size > maxFileSizeMB * 1024 * 1024) {
      return { valid: false, error: `Exceeds ${maxFileSizeMB} MB limit` };
    }
    if (accept && accept.length > 0) {
      const acceptedPatterns = accept.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const mimeType = file.type.toLowerCase();
      const matches = acceptedPatterns.some((pattern) => {
        if (pattern.startsWith(".")) {
          return fileExt === pattern;
        }
        if (pattern.endsWith("/*")) {
          return mimeType.startsWith(pattern.slice(0, -1));
        }
        return mimeType === pattern;
      });
      if (!matches) {
        return {
          valid: false,
          error: `Unsupported type${mimeType ? ` (${mimeType})` : ""} — expected: ${acceptedPatterns.join(", ")}`,
        };
      }
    }
    return { valid: true };
  };

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const newFiles: UploadedFile[] = [];

      for (const file of incoming) {
        const validation = validateFile(file);
        const uploaded: UploadedFile = {
          id: generateId(),
          file,
          status: validation.valid ? 'valid' : 'invalid',
          error: validation.error,
        };

        if (file.type.startsWith('image/')) {
          uploaded.previewUrl = URL.createObjectURL(file);
        }

        newFiles.push(uploaded);
      }

      const combined = multiple
        ? [...files, ...newFiles].slice(0, maxFiles)
        : newFiles.slice(0, 1);

      onFilesChange(combined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, multiple, maxFiles, maxFileSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageItems: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const file = items[i].getAsFile();
        if (file && file.type.startsWith('image/')) {
          imageItems.push(file);
        }
      }
      if (imageItems.length > 0) {
        processFiles(imageItems as unknown as FileList);
      }
    },
    [processFiles]
  );

  const removeFile = (id: string) => {
    const updated = files.filter((f) => {
      if (f.id === id && f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
      return f.id !== id;
    });
    onFilesChange(updated);
  };

  useEffect(() => {
    return () => {
      for (const uploaded of files) {
        if (uploaded.previewUrl) {
          URL.revokeObjectURL(uploaded.previewUrl);
        }
      }
    };
    // Only revoke on unmount; stale closure over `files` is acceptable here
    // because the parent owns the list and revokes removed files itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={cn(
          'relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((uploaded) => (
            <div
              key={uploaded.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              {uploaded.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploaded.previewUrl}
                  alt={uploaded.file.name}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{uploaded.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploaded.file.size)}
                </p>
                {uploaded.error && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="size-3" />
                    {uploaded.error}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeFile(uploaded.id)}
                aria-label="Remove file"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
