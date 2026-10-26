export type OnProgress = (percent: number) => void;

export type SplitMode = "ranges" | "each" | "interval";

export interface PdfPlan {
  pageRange?: string;
  rotation?: number;
  allPages?: boolean;
  mode?: SplitMode;
  ranges?: string;
  interval?: number;
  level?: "low" | "medium" | "high";
  format?: "png" | "jpeg";
  dpi?: number;
}

export interface PageRange {
  start: number;
  end: number;
}
