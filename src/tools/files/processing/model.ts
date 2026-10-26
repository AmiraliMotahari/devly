import type { ToolResult } from "@/types/tool";

export interface ArchiveOutcome {
  filename: string;
  blob: Blob;
  outputSize: number;
}

export interface ZipExtractOutcome {
  results: ToolResult[];
  renamedCount: number;
}

export interface DecryptedArchiveOutcome {
  results: ToolResult[];
  failures: string[];
}

export type HashAlgorithm = "all" | "md5" | "sha1" | "sha256" | "sha384" | "sha512";

export type FileHashes = {
  md5?: string;
  sha1?: string;
  sha256?: string;
  sha384?: string;
  sha512?: string;
};

export type OnProgress = (percent: number) => void;
