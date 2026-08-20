export type ProcessingMode = "client" | "server" | "hybrid";

export type ToolCategory =
  | "images"
  | "pdf"
  | "files"
  | "developer"
  | "text"
  | "data"
  | "web"
  | "colors"
  | "datetime"
  | "converters";

export type InputKind = "file" | "text" | "none";

export type OutputKind = "file" | "text" | "image" | "none";

export type ToolOption = {
  key: string;
  label: string;
  type: "slider" | "select" | "switch" | "number" | "text";
  min?: number;
  max?: number;
  step?: number;
  default: number | string | boolean;
  options?: { label: string; value: string }[];
  help?: string;
};

export type ToolDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  aliases?: string[];
  inputKind: InputKind;
  outputKind: OutputKind;
  processingMode: ProcessingMode;
  supportsBatch: boolean;
  requiresAuthentication: boolean;
  acceptFileTypes?: string[];
  maxFileSizeMB?: number;
  maxFiles?: number;
  options?: ToolOption[];
  keywords?: string[];
  relatedToolSlugs?: string[];
  faq?: { question: string; answer: string }[];
  howItWorks?: string[];
  available: boolean;
  unavailableReason?: string;
};

export type ToolResult = {
  filename: string;
  blob: Blob;
  previewUrl?: string;
  originalSize?: number;
  outputSize?: number;
  metadata?: Record<string, string | number>;
};

export type ProgressFn = (percent: number, label?: string) => void;

export type ProcessingContext = {
  jobId: string;
  signal: AbortSignal;
  onProgress: ProgressFn;
};

export type ToolProcessor = {
  process(
    input: File | string,
    options: Record<string, number | string | boolean>,
    ctx: ProcessingContext,
  ): Promise<ToolResult | ToolResult[]>;
};
