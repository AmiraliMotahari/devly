export { friendlyFileError } from "./errors";

import type { ToolResult } from "@/types/tool";
import { formatFileSize, sanitizeFilename } from "@/lib/file-security";
import {
  ENCRYPTED_EXTENSION,
  MANIFEST_FILENAME,
  PBKDF2_ITERATIONS,
  base64ToBytes,
  bytesToBase64,
  createManifest,
  decryptBytes,
  encryptFile,
  type ManifestEntry,
} from "../encrypted-archive";
import type {
  ArchiveOutcome,
  DecryptedArchiveOutcome,
  FileHashes,
  HashAlgorithm,
  OnProgress,
  ZipExtractOutcome,
} from "./model";
export type {
  ArchiveOutcome,
  DecryptedArchiveOutcome,
  FileHashes,
  HashAlgorithm,
  OnProgress,
  ZipExtractOutcome,
};

export async function loadZip(data: ArrayBuffer) {
  const JSZip = (await import("jszip")).default;
  return JSZip.loadAsync(data);
}

export async function zipBlobs(results: ToolResult[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const result of results) {
    zip.file(result.filename, result.blob);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function createArchive(
  files: File[],
  onProgress: OnProgress,
): Promise<ArchiveOutcome> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < files.length; i++) {
    onProgress(Math.round((i / files.length) * 80));
    zip.file(files[i].name, await files[i].arrayBuffer());
  }

  onProgress(85);
  const blob = await zip.generateAsync({ type: "blob" });
  onProgress(100);

  return { filename: "archive.zip", blob, outputSize: blob.size };
}

export async function extractArchive(
  archive: File,
  onProgress: OnProgress,
): Promise<ZipExtractOutcome> {
  const zip = await loadZip(await archive.arrayBuffer());
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  if (entries.length === 0) {
    throw new Error("The ZIP archive is empty.");
  }

  const results: ToolResult[] = [];
  const usedNames = new Set<string>();
  let renamedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    onProgress(Math.round((i / entries.length) * 90));
    const entry = entries[i];
    const baseName = sanitizeFilename(entry.name.split("/").pop() || "file");
    let safeName = baseName;
    let suffix = 2;
    let didRename = false;
    while (usedNames.has(safeName)) {
      const dot = baseName.lastIndexOf(".");
      const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
      const ext = dot > 0 ? baseName.slice(dot) : "";
      safeName = `${stem}-${suffix}${ext}`;
      suffix++;
      didRename = true;
    }
    if (didRename) renamedCount++;
    usedNames.add(safeName);
    const blob = await entry.async("blob");
    results.push({ filename: safeName, blob, outputSize: blob.size });
  }

  onProgress(100);
  return { results, renamedCount };
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

export async function createEncryptedArchive(
  files: File[],
  password: string,
  onProgress: OnProgress,
): Promise<ArchiveOutcome> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const manifestEntries: ManifestEntry[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];

    const { encrypted, salt, iv } = await encryptFile(file, password);

    zip.file(`${file.name}${ENCRYPTED_EXTENSION}`, encrypted);

    manifestEntries.push({
      name: file.name,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      size: file.size,
      encryptedSize: encrypted.byteLength,
    });

    onProgress(Math.round(((index + 1) / files.length) * 85));
  }

  zip.file(MANIFEST_FILENAME, JSON.stringify(createManifest(manifestEntries), null, 2));
  zip.file("README.txt", createReadme(manifestEntries));

  onProgress(95);
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  onProgress(100);

  return { filename: "encrypted-archive.zip", blob, outputSize: blob.size };
}

export async function extractEncryptedArchive(
  archive: File,
  password: string,
  onProgress: OnProgress,
): Promise<DecryptedArchiveOutcome> {
  const zip = await loadZip(await archive.arrayBuffer());

  const manifestFile = zip.file(MANIFEST_FILENAME);
  if (!manifestFile) {
    throw new Error(
      "No MANIFEST.json found. This does not look like an archive created by the Password ZIP tool.",
    );
  }

  const manifestValue: unknown = JSON.parse(await manifestFile.async("text"));
  if (
    typeof manifestValue !== "object" ||
    manifestValue === null ||
    (manifestValue as { algorithm?: unknown }).algorithm !== "AES-256-GCM" ||
    !Array.isArray((manifestValue as { files?: unknown }).files)
  ) {
    throw new Error("The MANIFEST.json in this archive is invalid.");
  }

  const manifest = manifestValue as {
    keyDerivation: { iterations: number };
    files: ManifestEntry[];
  };
  const iterations = manifest.keyDerivation.iterations;
  const decryptedResults: ToolResult[] = [];
  const failures: string[] = [];

  for (let index = 0; index < manifest.files.length; index++) {
    const entry = manifest.files[index];
    onProgress(Math.round((index / manifest.files.length) * 90));

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
        metadata: { "Original size": formatFileSize(entry.size) },
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

  onProgress(95);

  let results = decryptedResults;
  if (decryptedResults.length > 1 || failures.length > 0) {
    const zipBlob = await zipBlobs(decryptedResults);
    results = [
      {
        filename: "decrypted-files.zip",
        blob: zipBlob,
        outputSize: zipBlob.size,
        metadata: {
          "Files decrypted": decryptedResults.length.toString(),
          ...(failures.length > 0 ? { Failed: failures.length.toString() } : {}),
        },
      },
    ];
  }

  onProgress(100);
  return { results, failures };
}

async function shaHash(
  buffer: ArrayBuffer,
  algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  const ml = (bytes.length * 8) % 0x20000000;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((ml / Math.pow(2, i * 8)) % 256);

  let a0 = 0x67452301,
    b0 = 0xefcdab89,
    c0 = 0x98badcfe,
    d0 = 0x10325476;

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
      const temp =
        B +
        (((A + F + K[j] + M[g]) << s[j]) |
          ((A + F + K[j] + M[g]) >>> (32 - s[j])));
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
    toHex(a0) + toHex((a0 >> 8) & 0xff) + toHex((a0 >> 16) & 0xff) + toHex((a0 >> 24) & 0xff) +
    toHex(b0) + toHex((b0 >> 8) & 0xff) + toHex((b0 >> 16) & 0xff) + toHex((b0 >> 24) & 0xff) +
    toHex(c0) + toHex((c0 >> 8) & 0xff) + toHex((c0 >> 16) & 0xff) + toHex((c0 >> 24) & 0xff) +
    toHex(d0) + toHex((d0 >> 8) & 0xff) + toHex((d0 >> 16) & 0xff) + toHex((d0 >> 24) & 0xff)
  );
}

export async function computeFileHashes(
  file: File,
  algorithm: HashAlgorithm,
): Promise<FileHashes> {
  const buffer = await file.arrayBuffer();
  const hashes: FileHashes = {};

  if (algorithm === "all" || algorithm === "md5") hashes.md5 = await md5(buffer);
  if (algorithm === "all" || algorithm === "sha1")
    hashes.sha1 = await shaHash(buffer, "SHA-1");
  if (algorithm === "all" || algorithm === "sha256")
    hashes.sha256 = await shaHash(buffer, "SHA-256");
  if (algorithm === "all" || algorithm === "sha384")
    hashes.sha384 = await shaHash(buffer, "SHA-384");
  if (algorithm === "all" || algorithm === "sha512")
    hashes.sha512 = await shaHash(buffer, "SHA-512");

  return hashes;
}
