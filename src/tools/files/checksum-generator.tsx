"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Check, Copy, FileIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

interface UploadedFile {
  id: string;
  file: File;
  hashes: {
    md5?: string;
    sha1?: string;
    sha256?: string;
    sha384?: string;
    sha512?: string;
  } | null;
  isProcessing: boolean;
}

async function md5(buffer: ArrayBuffer): Promise<string> {
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14,
    20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16,
    23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
    15, 21, 6, 10, 15, 21,
  ];

  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000);
  }

  const bytes: number[] = Array.from(new Uint8Array(buffer));
  const bitLen = bytes.length * 8;
  const ml = bitLen % 0x20000000;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((ml / Math.pow(2, i * 8)) % 256);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < bytes.length / 64; i++) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] =
        bytes[i * 64 + j * 4] +
        (bytes[i * 64 + j * 4 + 1] << 8) +
        (bytes[i * 64 + j * 4 + 2] << 16) +
        (bytes[i * 64 + j * 4 + 3] << 24);
    }

    let A = a0,
      B = b0,
      C = c0,
      D = d0;

    for (let j = 0; j < 64; j++) {
      let F: number, g: number;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      } else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }

      const temp = B + (((A + F + K[j] + M[g]) << s[j]) | ((A + F + K[j] + M[g]) >>> (32 - s[j])));
      A = D;
      D = C;
      C = B;
      B = temp;
    }

    a0 += A;
    b0 += B;
    c0 += C;
    d0 += D;
  }

  const toHex = (n: number) => ((n >>> 0) & 0xff).toString(16).padStart(2, "0");
  return (
    toHex(a0) +
    toHex((a0 >> 8) & 0xff) +
    toHex((a0 >> 16) & 0xff) +
    toHex((a0 >> 24) & 0xff) +
    toHex(b0) +
    toHex((b0 >> 8) & 0xff) +
    toHex((b0 >> 16) & 0xff) +
    toHex((b0 >> 24) & 0xff) +
    toHex(c0) +
    toHex((c0 >> 8) & 0xff) +
    toHex((c0 >> 16) & 0xff) +
    toHex((c0 >> 24) & 0xff) +
    toHex(d0) +
    toHex((d0 >> 8) & 0xff) +
    toHex((d0 >> 16) & 0xff) +
    toHex((d0 >> 24) & 0xff)
  );
}

async function shaHash(
  buffer: ArrayBuffer,
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ChecksumGenerator({}: ToolComponentProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [algorithm, setAlgorithm] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      const buffer = await file.file.arrayBuffer();
      const hashes: UploadedFile["hashes"] = {};

      if (algorithm === "all" || algorithm === "md5") {
        hashes.md5 = await md5(buffer);
      }
      if (algorithm === "all" || algorithm === "sha1") {
        hashes.sha1 = await shaHash(buffer, "SHA-1");
      }
      if (algorithm === "all" || algorithm === "sha256") {
        hashes.sha256 = await shaHash(buffer, "SHA-256");
      }
      if (algorithm === "all" || algorithm === "sha384") {
        hashes.sha384 = await shaHash(buffer, "SHA-384");
      }
      if (algorithm === "all" || algorithm === "sha512") {
        hashes.sha512 = await shaHash(buffer, "SHA-512");
      }

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

  const copyHash = async (id: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  const copyAllHashes = async (file: UploadedFile) => {
    if (!file.hashes) return;
    const text = Object.entries(file.hashes)
      .map(([algo, hash]) => `${algo.toUpperCase()}: ${hash}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(`${file.file.name}:\n${text}`);
      setCopiedId(file.id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
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
          <Select value={algorithm} onValueChange={setAlgorithm}>
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
                        <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                          {hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyHash(`${file.id}-${algo}`, hash!)}
                          aria-label="Copy hash"
                        >
                          {copiedId === `${file.id}-${algo}` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyAllHashes(file)}
                    >
                      <Copy data-icon="inline-start" />
                      Copy All
                    </Button>
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