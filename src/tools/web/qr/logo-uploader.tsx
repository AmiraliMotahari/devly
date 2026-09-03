"use client";

import { useRef, useState } from "react";
import { Image, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

type LogoUploaderProps = {
  maxSizeMB?: number;
  className?: string;
  value?: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
};

export function LogoUploader({
  maxSizeMB = 5,
  className,
  value,
  onChange,
  onRemove,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const readFile = (file: File) => {
    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Use PNG, JPG, WEBP or SVG.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds the ${maxSizeMB} MB limit.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleClick = () => inputRef.current?.click();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a logo"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = "";
          }}
        />

        {value ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Logo" className="size-24 object-contain" />
            <p className="text-sm text-muted-foreground">
              Click or drop another image to replace
            </p>
          </div>
        ) : (
          <>
            <Upload className="mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">Upload a logo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              PNG, JPG, SVG, WEBP &bull; Max {maxSizeMB}MB
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {value && (
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div className="flex items-center gap-2 text-sm">
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Lucide icon, not an img element */}
            <Image className="size-4" />
            Logo ready
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              onChange("");
              onRemove?.();
            }}
          >
            <Trash2 data-icon="inline-start" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
