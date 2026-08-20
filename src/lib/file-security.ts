export const MAX_FILE_SIZE_MB = 500;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const ACCEPTED_PDF_TYPE = "application/pdf";
const ACCEPTED_ZIP_TYPES = ["application/zip", "application/x-zip-compressed"];

interface FileSignature {
  offset: number;
  bytes: number[];
  mime: string;
}

const FILE_SIGNATURES: FileSignature[] = [
  { offset: 0, bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
  { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf" },
  { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip" },
  { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06], mime: "application/zip" },
  { offset: 0, bytes: [0x50, 0x4b, 0x07, 0x08], mime: "application/zip" },
];

export async function detectMimeType(file: File): Promise<string> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    for (const sig of FILE_SIGNATURES) {
      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (bytes[sig.offset + i] !== sig.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) return sig.mime;
    }
  } catch {
    // Fall through to declared type
  }
  return file.type || "application/octet-stream";
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 255);
}

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function replaceExtension(filename: string, newExt: string): string {
  const base = filename.replace(/\.[^/.]+$/, "");
  return `${base}.${newExt}`;
}

export function validateFileSize(
  file: File,
  maxMB: number,
): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    return {
      valid: false,
      error: `File "${file.name}" is ${sizeMB.toFixed(1)} MB. Maximum is ${maxMB} MB.`,
    };
  }
  return { valid: true };
}

export function validateFileCount(
  files: File[],
  maxFiles: number,
): { valid: boolean; error?: string } {
  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `You can upload at most ${maxFiles} files at once. You selected ${files.length}.`,
    };
  }
  return { valid: true };
}

export function isAcceptedImageType(mime: string): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(mime);
}

export function isAcceptedPdfType(mime: string): boolean {
  return mime === ACCEPTED_PDF_TYPE;
}

export function isAcceptedZipType(mime: string): boolean {
  return ACCEPTED_ZIP_TYPES.includes(mime);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function calculateCompressionRatio(
  original: number,
  compressed: number,
): number {
  if (original === 0) return 0;
  return ((original - compressed) / original) * 100;
}
