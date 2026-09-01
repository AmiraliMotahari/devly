import type { LanguageId } from "./types";

const LANGUAGE_ALIASES = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  py: "python",
  rs: "rust",
  "c++": "cpp",
  "c#": "csharp",
  docker: "dockerfile",
  txt: "text",
  plain: "text",
  plaintext: "text",
} as const satisfies Record<string, LanguageId>;

const LANGUAGE_SET = new Set<LanguageId>([
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
]);

const MIME_TO_LANGUAGE = {
  "application/json": "json",
  "application/javascript": "javascript",
  "text/javascript": "javascript",
  "text/typescript": "typescript",
  "text/html": "html",
  "text/css": "css",
  "application/xml": "xml",
  "text/xml": "xml",
  "application/sql": "sql",
  "text/x-sql": "sql",
  "text/x-python": "python",
  "text/yaml": "yaml",
  "application/x-yaml": "yaml",
  "text/markdown": "markdown",
} as const satisfies Record<string, LanguageId>;

const EXTENSION_TO_LANGUAGE = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".jsx": "jsx",
  ".tsx": "tsx",
  ".json": "json",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".xml": "xml",
  ".sql": "sql",
  ".py": "python",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".go": "go",
  ".rs": "rust",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".markdown": "markdown",
  ".toml": "toml",
} as const satisfies Record<string, LanguageId>;

const LANGUAGE_LABELS: Record<LanguageId, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  sql: "SQL",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  yaml: "YAML",
  markdown: "Markdown",
  dockerfile: "Dockerfile",
  xml: "XML",
  toml: "TOML",
  text: "Text",
};

export function resolveLanguage(input?: string): LanguageId {
  const normalized = input?.trim().toLowerCase();

  if (!normalized) return "text";

  const aliased = LANGUAGE_ALIASES[normalized as keyof typeof LANGUAGE_ALIASES];
  if (aliased) return aliased;

  return LANGUAGE_SET.has(normalized as LanguageId)
    ? (normalized as LanguageId)
    : "text";
}

export function resolveCodeLanguage({
  language,
  filename,
  mimeType,
}: {
  language?: string;
  filename?: string;
  mimeType?: string;
}): LanguageId {
  if (language) return resolveLanguage(language);

  if (filename) {
    const normalized = filename.trim().toLowerCase();

    if (normalized === "dockerfile" || normalized.startsWith("dockerfile.")) {
      return "dockerfile";
    }

    const extension = getExtension(normalized);
    if (extension) {
      const resolved =
        EXTENSION_TO_LANGUAGE[
          extension as keyof typeof EXTENSION_TO_LANGUAGE
        ];
      if (resolved) return resolved;
    }
  }

  if (mimeType) {
    const resolved =
      MIME_TO_LANGUAGE[
        mimeType.trim().toLowerCase() as keyof typeof MIME_TO_LANGUAGE
      ];
    if (resolved) return resolved;
  }

  return "text";
}

export function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[resolveLanguage(language)];
}

function getExtension(filename: string): string | undefined {
  const index = filename.lastIndexOf(".");
  if (index <= 0 || index === filename.length - 1) return undefined;
  return filename.slice(index);
}
