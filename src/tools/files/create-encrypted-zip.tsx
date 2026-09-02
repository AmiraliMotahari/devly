"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, FileIcon, Loader2, Play, Upload, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ResultPanel } from "@/components/result-panel";
import { formatFileSize } from "@/lib/file-security";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ENCRYPTED_EXTENSION,
  MANIFEST_FILENAME,
  PBKDF2_ITERATIONS,
  bytesToBase64,
  createManifest,
  encryptFile,
  type ManifestEntry,
} from "./encrypted-archive";

const MAX_FILES = 200;

const ARCHIVE_FILENAME = "encrypted-archive.zip";
const README_FILENAME = "README.txt";

interface UploadedFile {
  id: string;
  file: File;
}

interface Result {
  filename: string;
  blob: Blob;
}

function createReadme(entries: ManifestEntry[]): string {
  return [
    "Encrypted Archive",
    "",
    `This archive contains ${entries.length} encrypted file(s).`,
    `Encryption: AES-256-GCM`,
    `Key derivation: PBKDF2-SHA256 (${PBKDF2_ITERATIONS.toLocaleString()} iterations)`,
    "",
    "To decrypt the files, open this archive with the Decrypt Encrypted ZIP tool using the same password.",
    "",
    "Files in this archive:",
    ...entries.map(
      (entry) => `  - ${entry.name} (${formatFileSize(entry.size)})`,
    ),
  ].join("\n");
}

function validateFiles(files: UploadedFile[]): string | null {
  if (files.length === 0) {
    return "Please select files to add to the archive";
  }

  if (files.length > MAX_FILES) {
    return `You can add up to ${MAX_FILES} files`;
  }

  const filenames = new Set<string>();

  for (const uploaded of files) {
    if (filenames.has(uploaded.file.name)) {
      return `Duplicate filename detected: "${uploaded.file.name}"`;
    }

    filenames.add(uploaded.file.name);
  }

  return null;
}

export function CreateEncryptedZip({}: ToolComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return;

    setError(null);

    setFiles((currentFiles) => {
      const remainingSlots = MAX_FILES - currentFiles.length;

      if (remainingSlots <= 0) {
        setError(`You can add up to ${MAX_FILES} files`);
        return currentFiles;
      }

      const incomingFiles = Array.from(fileList).slice(0, remainingSlots);

      const existingNames = new Set(currentFiles.map(({ file }) => file.name));

      const newFiles = incomingFiles
        .filter((file) => !existingNames.has(file.name))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
        }));

      if (newFiles.length < incomingFiles.length) {
        setError("Some files were skipped because their names already exist");
      }

      return [...currentFiles, ...newFiles];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((currentFiles) =>
      currentFiles.filter((uploaded) => uploaded.id !== id),
    );
  }, []);

  const handleCreate = useCallback(async () => {
    const validationError = validateFiles(files);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!password.length) {
      setError("Please enter a password to encrypt the ZIP");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const manifestEntries: ManifestEntry[] = [];

      for (let index = 0; index < files.length; index++) {
        const uploaded = files[index];

        const { encrypted, salt, iv } = await encryptFile(
          uploaded.file,
          password,
        );

        zip.file(`${uploaded.file.name}${ENCRYPTED_EXTENSION}`, encrypted);

        manifestEntries.push({
          name: uploaded.file.name,
          salt: bytesToBase64(salt),
          iv: bytesToBase64(iv),
          size: uploaded.file.size,
          encryptedSize: encrypted.byteLength,
        });

        setProgress(Math.round(((index + 1) / files.length) * 85));
      }

      const manifest = createManifest(manifestEntries);

      zip.file(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));

      zip.file(README_FILENAME, createReadme(manifestEntries));

      setProgress(95);

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9,
        },
      });

      setResults([
        {
          filename: ARCHIVE_FILENAME,
          blob,
        },
      ]);

      setProgress(100);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "An unknown error occurred";

      setError(`Failed to create encrypted archive: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [files, password]);

  const handleProcessAnother = useCallback(() => {
    setResults([]);
    setFiles([]);
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
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  if (results.length > 0) {
    return (
      <ResultPanel
        results={results.map(({ filename, blob }) => ({
          filename,
          blob,
          outputSize: blob.size,
        }))}
        onProcessAnother={handleProcessAnother}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files"
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
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />

        <p className="text-sm font-medium">
          Drop files here or click to browse
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Any file type, up to {MAX_FILES} files
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold">
              {files.length} {files.length === 1 ? "file" : "files"}
            </h3>

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {files.map(({ id, file }) => (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>

                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeFile(id)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="encryption-password">Password</Label>

        <Input
          id="encryption-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password for encryption"
          autoComplete="new-password"
          disabled={isProcessing}
        />

        <p className="text-xs text-muted-foreground">
          Each file is individually encrypted with AES-256-GCM (keys derived
          from your password via PBKDF2-SHA256), then packaged into a ZIP with
          a MANIFEST.json of salts and IVs. Decrypt with the Decrypt Encrypted
          ZIP tool — the password never leaves this page.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Encrypting files...
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
          disabled={files.length === 0 || password.length === 0}
          onClick={handleCreate}
        >
          <Play data-icon="inline-start" />
          Create Encrypted Archive
        </Button>
      )}
    </div>
  );
}
