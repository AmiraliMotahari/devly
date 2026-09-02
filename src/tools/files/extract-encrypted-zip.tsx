"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  Play,
  Upload,
  X,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ResultPanel } from "@/components/result-panel";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import type { ToolResult } from "@/types/tool";
import {
  ENCRYPTED_EXTENSION,
  MANIFEST_FILENAME,
  base64ToBytes,
  decryptBytes,
  type EncryptedArchiveManifest,
} from "./encrypted-archive";

function isEncryptedArchiveManifest(value: unknown): value is EncryptedArchiveManifest {
  if (typeof value !== "object" || value === null) return false;
  const manifest = value as Record<string, unknown>;
  return (
    manifest.algorithm === "AES-256-GCM" &&
    typeof manifest.keyDerivation === "object" &&
    manifest.keyDerivation !== null &&
    typeof (manifest.keyDerivation as { iterations?: unknown }).iterations ===
      "number" &&
    Array.isArray(manifest.files)
  );
}

export function ExtractEncryptedZip({}: ToolComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [archive, setArchive] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((files: FileList | null) => {
    const file = files?.[0];

    if (!file) return;

    setError(null);
    setArchive(file);
    setResults([]);
  }, []);

  const handleDecrypt = useCallback(async () => {
    if (!archive) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(await archive.arrayBuffer());

      const manifestFile = zip.file(MANIFEST_FILENAME);

      if (!manifestFile) {
        throw new Error(
          "No MANIFEST.json found. This does not look like an archive created by the Password ZIP tool.",
        );
      }

      const manifestValue: unknown = JSON.parse(await manifestFile.async("text"));

      if (!isEncryptedArchiveManifest(manifestValue)) {
        throw new Error("The MANIFEST.json in this archive is invalid.");
      }

      const iterations = manifestValue.keyDerivation.iterations;
      const decryptedResults: ToolResult[] = [];
      const failures: string[] = [];

      for (let index = 0; index < manifestValue.files.length; index++) {
        const entry = manifestValue.files[index];
        setProgress(Math.round((index / manifestValue.files.length) * 90));

        const encryptedFile = zip.file(`${entry.name}${ENCRYPTED_EXTENSION}`);

        if (!encryptedFile) {
          failures.push(`${entry.name} — missing from archive`);
          continue;
        }

        try {
          const encrypted = await encryptedFile.async("arraybuffer");
          const decrypted = await decryptBytes(
            encrypted,
            password,
            base64ToBytes(entry.salt) as Uint8Array<ArrayBuffer>,
            base64ToBytes(entry.iv) as Uint8Array<ArrayBuffer>,
            iterations,
          );

          const blob = new Blob([decrypted]);

          if (blob.size !== entry.size) {
            failures.push(`${entry.name} — size mismatch after decryption`);
            continue;
          }

          decryptedResults.push({
            filename: entry.name,
            blob,
            outputSize: blob.size,
            metadata: {
              "Original size": formatFileSize(entry.size),
            },
          });
        } catch {
          failures.push(`${entry.name} — wrong password or corrupted data`);
        }
      }

      if (decryptedResults.length === 0) {
        throw new Error(
          failures.length > 0
            ? `Could not decrypt any files. ${failures[0]}`
            : "No encrypted files were found in this archive.",
        );
      }

      setProgress(95);

      if (decryptedResults.length === 1 && failures.length === 0) {
        setResults(decryptedResults);
      } else {
        const JSZipOut = (await import("jszip")).default;
        const outZip = new JSZipOut();

        for (const result of decryptedResults) {
          outZip.file(result.filename, result.blob);
        }

        const zipBlob = await outZip.generateAsync({ type: "blob" });

        setResults([
          {
            filename: "decrypted-files.zip",
            blob: zipBlob,
            outputSize: zipBlob.size,
            metadata: {
              "Files decrypted": decryptedResults.length.toString(),
              ...(failures.length > 0
                ? { Failed: failures.length.toString() }
                : {}),
            },
          },
        ]);
      }

      setProgress(100);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "An unknown error occurred";

      setError(`Failed to decrypt archive: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [archive, password]);

  const handleProcessAnother = useCallback(() => {
    setResults([]);
    setArchive(null);
    setPassword("");
    setError(null);
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleFile(event.dataTransfer.files);
    },
    [handleFile],
  );

  if (results.length > 0) {
    return (
      <ResultPanel
        results={results}
        onProcessAnother={handleProcessAnother}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an encrypted ZIP archive"
        className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mb-3 size-10 text-muted-foreground" />

        <p className="text-sm font-medium">
          Drop an encrypted archive here or click to browse
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          ZIP archives created by the Password ZIP tool
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event) => {
            handleFile(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {archive && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Lock className="size-5 text-muted-foreground" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{archive.name}</p>

                <p className="text-xs text-muted-foreground">
                  {formatFileSize(archive.size)}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setArchive(null)}
                aria-label={`Remove ${archive.name}`}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="decryption-password">Password</Label>

        <Input
          id="decryption-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter the password used to encrypt the archive"
          autoComplete="current-password"
          disabled={isProcessing}
        />

        <p className="text-xs text-muted-foreground">
          Files are decrypted in your browser with AES-256-GCM. Each file is
          authenticated — a wrong password is detected per file and reported,
          never silently skipped.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Decryption failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin" />
              Decrypting files...
            </span>

            <span className="tabular-nums text-muted-foreground">
              {progress}%
            </span>
          </div>

          <Progress value={progress} />
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!archive || password.length === 0}
          onClick={handleDecrypt}
        >
          <Play data-icon="inline-start" />
          Decrypt Archive
        </Button>
      )}
    </div>
  );
}
