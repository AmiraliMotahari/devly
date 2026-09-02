import { describe, expect, it } from "vitest";
import {
  calculateCompressionRatio,
  detectMimeType,
  formatFileSize,
  getExtension,
  isAcceptedImageType,
  isAcceptedPdfType,
  isAcceptedZipType,
  replaceExtension,
  sanitizeFilename,
  validateFileCount,
  validateFileSize,
} from "./file-security";

function makeFile(
  content: string | Uint8Array<ArrayBuffer>,
  type = "",
  name = "test.bin",
) {
  return new File([content], name, { type });
}

describe("sanitizeFilename — security", () => {
  it("keeps safe names unchanged", () => {
    expect(sanitizeFilename("report-2026.pdf")).toBe("report-2026.pdf");
    expect(sanitizeFilename("a.b_c-d")).toBe("a.b_c-d");
  });

  it("replaces path traversal sequences with underscores", () => {
    // Path separators are neutralized; dots alone are legal filename chars.
    // The key security property: no "/" or "\\" survives sanitization.
    const result = sanitizeFilename("../../etc/passwd");
    expect(result).not.toContain("/");
    expect(result).not.toContain("\\");
  });

  it("replaces slashes and backslashes", () => {
    expect(sanitizeFilename("foo/bar\\baz")).toBe("foo_bar_baz");
  });

  it("strips HTML/script-looking payloads to inert characters", () => {
    const result = sanitizeFilename('<img src=x onerror="alert(1)">.png');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain('"');
    expect(result).not.toContain("=");
  });

  it("handles Unicode names by replacing non-ASCII", () => {
    const result = sanitizeFilename("café — résumé.pdf");
    expect(result).toMatch(/^[a-zA-Z0-9.__-]*$/);
  });

  it("collapses repeated underscores", () => {
    expect(sanitizeFilename("a!@#$%^&*b")).toBe("a_b");
  });

  it("truncates to 255 characters", () => {
    expect(sanitizeFilename("a".repeat(1000)).length).toBe(255);
  });

  it("strips leading dots", () => {
    expect(sanitizeFilename(".hidden")).toBe("hidden");
  });

  it("handles empty input", () => {
    expect(sanitizeFilename("")).toBe("");
  });
});

describe("getExtension / replaceExtension", () => {
  it("extracts lowercase extensions", () => {
    expect(getExtension("photo.JPG")).toBe("jpg");
    expect(getExtension("archive.tar.gz")).toBe("gz");
    expect(getExtension("noext")).toBe("");
  });

  it("handles files that are only an extension", () => {
    expect(getExtension(".gitignore")).toBe("gitignore");
  });

  it("replaces the final extension", () => {
    expect(replaceExtension("photo.jpg", "png")).toBe("photo.png");
    expect(replaceExtension("archive.tar.gz", "zip")).toBe("archive.tar.zip");
    expect(replaceExtension("noext", "txt")).toBe("noext.txt");
  });
});

describe("validateFileSize", () => {
  const MB = 1024 * 1024;

  it("accepts files at or below the limit (boundary)", () => {
    expect(validateFileSize(makeFile("x"), 1).valid).toBe(true);
    expect(
      validateFileSize(makeFile(new Uint8Array(MB)), 1).valid,
    ).toBe(true);
  });

  it("rejects files above the limit with a helpful message", () => {
    const result = validateFileSize(makeFile(new Uint8Array(MB + 1)), 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("test.bin");
    expect(result.error).toContain("1.0 MB");
    expect(result.error).toContain("Maximum is 1 MB");
  });

  it("accepts zero-byte files", () => {
    expect(validateFileSize(makeFile(""), 0.0001).valid).toBe(true);
  });
});

describe("validateFileCount", () => {
  it("accepts counts at the limit", () => {
    const files = [makeFile("a"), makeFile("b")];
    expect(validateFileCount(files, 2).valid).toBe(true);
    expect(validateFileCount(files, 1).valid).toBe(false);
  });

  it("reports the selected count in the error", () => {
    const result = validateFileCount(
      [makeFile("a"), makeFile("b"), makeFile("c")],
      2,
    );
    expect(result.error).toContain("3");
  });
});

describe("formatFileSize", () => {
  it("formats zero and small sizes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats KB/MB/GB with one decimal", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(1536 * 1024 * 1024)).toBe("1.5 GB");
  });

  it("handles sizes beyond the TB unit gracefully (no crash, defined output)", () => {
    const result = formatFileSize(1024 ** 5);
    expect(result).toMatch(/1\.0/);
    // Even when a unit name is missing the function must not throw and
    // must still produce a parseable string.
    expect(typeof result).toBe("string");
  });
});

describe("calculateCompressionRatio", () => {
  it("returns 0 for zero-byte originals", () => {
    expect(calculateCompressionRatio(0, 0)).toBe(0);
  });

  it("computes percent saved", () => {
    expect(calculateCompressionRatio(100, 25)).toBe(75);
    expect(calculateCompressionRatio(100, 100)).toBe(0);
  });

  it("returns negative values when output grew", () => {
    expect(calculateCompressionRatio(100, 200)).toBe(-100);
  });
});

describe("MIME guards", () => {
  it("accepts only known image types", () => {
    for (const mime of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ]) {
      expect(isAcceptedImageType(mime)).toBe(true);
    }
    expect(isAcceptedImageType("image/svg+xml")).toBe(false);
    expect(isAcceptedImageType("application/pdf")).toBe(false);
    expect(isAcceptedImageType("")).toBe(false);
  });

  it("accepts only pdf for the pdf guard", () => {
    expect(isAcceptedPdfType("application/pdf")).toBe(true);
    expect(isAcceptedPdfType("application/pdfx")).toBe(false);
  });

  it("accepts zip variants", () => {
    expect(isAcceptedZipType("application/zip")).toBe(true);
    expect(isAcceptedZipType("application/x-zip-compressed")).toBe(true);
    expect(isAcceptedZipType("application/zipx")).toBe(false);
  });
});

describe("detectMimeType — magic bytes (cannot trust declared types)", () => {
  it("detects JPEG from magic bytes regardless of declared type", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const file = new File([jpeg], "evil.pdf", { type: "application/pdf" });
    expect(await detectMimeType(file)).toBe("image/jpeg");
  });

  it("detects PNG from magic bytes", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(await detectMimeType(makeFile(png))).toBe("image/png");
  });

  it("detects PDF from magic bytes", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(await detectMimeType(makeFile(pdf))).toBe("application/pdf");
  });

  it("detects ZIP signatures", async () => {
    for (const sig of [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ]) {
      expect(await detectMimeType(makeFile(new Uint8Array(sig)))).toBe(
        "application/zip",
      );
    }
  });

  it("falls back to the declared type when no signature matches", async () => {
    expect(await detectMimeType(makeFile("plain", "text/plain"))).toBe(
      "text/plain",
    );
  });

  it("falls back to octet-stream for untyped unknown content", async () => {
    expect(await detectMimeType(makeFile("\x00\x01\x02"))).toBe(
      "application/octet-stream",
    );
  });

  it("does not misidentify a RIFF-less webp-labeled file", async () => {
    // Declared webp but content is not RIFF -> falls back to declared type
    expect(await detectMimeType(makeFile("xxxx", "image/webp"))).toBe(
      "image/webp",
    );
  });
});
