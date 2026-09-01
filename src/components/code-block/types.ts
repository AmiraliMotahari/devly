export const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "css",
  "html",
  "sql",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "yaml",
  "markdown",
  "dockerfile",
  "xml",
  "toml",
  "text",
] as const;

export type LanguageId = (typeof CODE_LANGUAGES)[number];

export type CodeBlockProps = {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  highlightLines?: readonly number[];
  maxHeight?: string;
  className?: string;
};
