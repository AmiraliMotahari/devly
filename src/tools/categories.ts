import type { ToolCategory } from "@/types/tool";

export const CATEGORY_META: Record<
  ToolCategory,
  { label: string; description: string; icon: string }
> = {
  images: {
    label: "Images",
    description: "Convert, compress, resize and edit images",
    icon: "Image",
  },
  pdf: {
    label: "PDF",
    description: "Merge, split, compress and transform PDF files",
    icon: "FileText",
  },
  files: {
    label: "Files",
    description: "Archives, checksums, encoding and file utilities",
    icon: "FolderArchive",
  },
  developer: {
    label: "Developer",
    description: "JSON, Base64, UUID, hashing and dev tools",
    icon: "Code2",
  },
  text: {
    label: "Text",
    description: "Count, format, transform and clean text",
    icon: "Type",
  },
  data: {
    label: "Data",
    description: "Convert between CSV, JSON, XML and YAML",
    icon: "Table",
  },
  web: {
    label: "Web",
    description: "QR codes, URLs, meta tags and web utilities",
    icon: "Globe",
  },
  colors: {
    label: "Colors",
    description: "Convert, pick and analyze colors",
    icon: "Palette",
  },
  datetime: {
    label: "Date & Time",
    description: "Timestamps, timezones and date calculators",
    icon: "CalendarClock",
  },
  converters: {
    label: "Converters",
    description: "Units, data sizes and general conversion",
    icon: "Repeat2",
  },
};

export const TOOL_CATEGORIES = Object.keys(CATEGORY_META) as ToolCategory[];
