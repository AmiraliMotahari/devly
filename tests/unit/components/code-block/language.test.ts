import { describe, expect, it } from "vitest";
import {
  getLanguageLabel,
  resolveCodeLanguage,
  resolveLanguage,
} from "@/components/code-block/language";

describe("resolveLanguage — aliases", () => {
  it.each([
    ["js", "javascript"],
    ["mjs", "javascript"],
    ["ts", "typescript"],
    ["sh", "bash"],
    ["shell", "bash"],
    ["yml", "yaml"],
    ["md", "markdown"],
    ["py", "python"],
    ["rs", "rust"],
    ["c++", "cpp"],
    ["c#", "csharp"],
    ["txt", "text"],
    ["plaintext", "text"],
  ])("maps %s → %s", (input, expected) => {
    expect(resolveLanguage(input)).toBe(expected);
  });

  it("passes canonical ids through", () => {
    expect(resolveLanguage("typescript")).toBe("typescript");
    expect(resolveLanguage("dockerfile")).toBe("dockerfile");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(resolveLanguage("  JavaScript ")).toBe("javascript");
  });

  it("falls back to text for unknown languages", () => {
    expect(resolveLanguage("brainfuck")).toBe("text");
    expect(resolveLanguage("not-a-language")).toBe("text");
  });

  it("falls back to text for empty/undefined input", () => {
    expect(resolveLanguage("")).toBe("text");
    expect(resolveLanguage(undefined)).toBe("text");
    expect(resolveLanguage("   ")).toBe("text");
  });
});

describe("resolveCodeLanguage — filename inference", () => {
  it.each([
    ["app.ts", "typescript"],
    ["index.js", "javascript"],
    ["component.tsx", "tsx"],
    ["widget.jsx", "jsx"],
    ["data.json", "json"],
    ["deploy.sh", "bash"],
    ["styles.css", "css"],
    ["page.html", "html"],
    ["doc.htm", "html"],
    ["feed.xml", "xml"],
    ["query.sql", "sql"],
    ["main.py", "python"],
    ["Main.java", "java"],
    ["lib.c", "c"],
    ["header.h", "c"],
    ["app.cpp", "cpp"],
    ["Program.cs", "csharp"],
    ["server.go", "go"],
    ["main.rs", "rust"],
    ["config.yaml", "yaml"],
    ["config.yml", "yaml"],
    ["README.md", "markdown"],
    ["Cargo.toml", "toml"],
  ])("resolves %s by extension", (filename, expected) => {
    expect(resolveCodeLanguage({ filename })).toBe(expected);
  });

  it("treats a Dockerfile (with or without extension) as dockerfile", () => {
    expect(resolveCodeLanguage({ filename: "Dockerfile" })).toBe(
      "dockerfile",
    );
    expect(resolveCodeLanguage({ filename: "Dockerfile.dev" })).toBe(
      "dockerfile",
    );
    expect(resolveCodeLanguage({ filename: "dockerfile.prod" })).toBe(
      "dockerfile",
    );
  });

  it("is case-insensitive on filenames", () => {
    expect(resolveCodeLanguage({ filename: "APP.TS" })).toBe("typescript");
  });

  it("ignores dotfiles and bare dots", () => {
    expect(resolveCodeLanguage({ filename: ".gitignore" })).toBe("text");
    expect(resolveCodeLanguage({ filename: "trailing." })).toBe("text");
  });
});

describe("resolveCodeLanguage — MIME inference", () => {
  it.each([
    ["application/json", "json"],
    ["text/html", "html"],
    ["text/css", "css"],
    ["application/xml", "xml"],
    ["text/xml", "xml"],
    ["text/x-sql", "sql"],
    ["text/yaml", "yaml"],
    ["text/markdown", "markdown"],
    ["text/javascript", "javascript"],
  ])("resolves %s", (mime, expected) => {
    expect(resolveCodeLanguage({ mimeType: mime })).toBe(expected);
  });

  it("falls back to text for unknown MIME types", () => {
    expect(resolveCodeLanguage({ mimeType: "application/octet-stream" })).toBe(
      "text",
    );
  });
});

describe("resolveCodeLanguage — precedence", () => {
  it("explicit language wins over filename and MIME", () => {
    expect(
      resolveCodeLanguage({
        language: "python",
        filename: "data.json",
        mimeType: "application/json",
      }),
    ).toBe("python");
  });

  it("filename wins over MIME", () => {
    expect(
      resolveCodeLanguage({
        filename: "data.json",
        mimeType: "text/plain",
      }),
    ).toBe("json");
  });

  it("uses MIME when no filename or language", () => {
    expect(resolveCodeLanguage({ mimeType: "text/html" })).toBe("html");
  });

  it("returns text when nothing is provided", () => {
    expect(resolveCodeLanguage({})).toBe("text");
  });
});

describe("getLanguageLabel", () => {
  it("returns human labels for known languages", () => {
    expect(getLanguageLabel("typescript")).toBe("TypeScript");
    expect(getLanguageLabel("cpp")).toBe("C++");
    expect(getLanguageLabel("csharp")).toBe("C#");
  });

  it("returns Text for unknown languages", () => {
    expect(getLanguageLabel("zzz")).toBe("Text");
  });
});
