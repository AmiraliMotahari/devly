import { describe, expect, it } from "vitest";
import {
  validateFile,
  matchesAccept,
  acceptedFileSchema,
} from "@/lib/file-validation";

const png = { name: "photo.png", size: 1000, type: "image/png" };
const csv = { name: "data.csv", size: 1000, type: "text/csv" };
const noType = { name: "data.csv", size: 1000, type: "" };

describe("matchesAccept", () => {
  it("matches an exact MIME type", () => {
    expect(matchesAccept(png, ["image/png"])).toBe(true);
    expect(matchesAccept(png, ["image/jpeg"])).toBe(false);
  });

  it("matches a wildcard group", () => {
    expect(matchesAccept(png, ["image/*"])).toBe(true);
    expect(matchesAccept(csv, ["image/*"])).toBe(false);
  });

  it("matches an extension pattern", () => {
    expect(matchesAccept(csv, [".csv"])).toBe(true);
    expect(matchesAccept(png, [".csv"])).toBe(false);
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(matchesAccept(png, [" IMAGE/PNG "])).toBe(true);
  });

  it("matches any of several patterns", () => {
    expect(matchesAccept(csv, ["image/*", "text/csv"])).toBe(true);
  });
});

describe("validateFile", () => {
  it("accepts a matching file", () => {
    expect(validateFile(png, "image/*", 50)).toBeNull();
  });

  it("rejects a file over the size limit", () => {
    const big = { ...png, size: 60 * 1024 * 1024 };
    expect(validateFile(big, "image/*", 50)).toBe("Exceeds 50 MB limit");
  });

  it("rejects an unsupported type and says what was expected", () => {
    expect(validateFile(csv, "image/*", 50)).toContain("Unsupported type");
    expect(validateFile(csv, "image/*", 50)).toContain("image/*");
  });

  it("falls back to the extension when the file has no MIME type", () => {
    expect(validateFile(noType, ".csv", 50)).toBeNull();
    expect(validateFile(noType, "image/*", 50)).toContain("Unsupported type");
  });

  it("accepts anything when no patterns are given", () => {
    expect(validateFile(csv, "", 50)).toBeNull();
  });

  it("ignores the size limit when it is 0", () => {
    const big = { ...png, size: 500 * 1024 * 1024 };
    expect(validateFile(big, "image/*", 0)).toBeNull();
  });
});

describe("acceptedFileSchema", () => {
  it("exposes zod issues for invalid files", () => {
    const result = acceptedFileSchema("image/png", 1).safeParse({
      ...png,
      size: 5 * 1024 * 1024,
    });
    expect(result.success).toBe(false);
  });
});
