import { describe, it, expect } from "vitest";
import { parsePageRanges, pdfBytesToBlob } from "@/tools/pdf/processing/pipeline";

describe("pdf/processing pipeline", () => {
  it("parsePageRanges: single page", () => {
    expect(parsePageRanges("1", 5)).toEqual([0]);
  });

  it("parsePageRanges: range", () => {
    expect(parsePageRanges("2-4", 5)).toEqual([1, 2, 3]);
  });

  it("parsePageRanges: comma-separated mix", () => {
    expect(parsePageRanges("1,3-5", 5)).toEqual([0, 2, 3, 4]);
  });

  it("parsePageRanges: out of bounds throws", () => {
    expect(() => parsePageRanges("6", 5)).toThrow();
    expect(() => parsePageRanges("0-2", 5)).toThrow();
    expect(() => parsePageRanges("3-1", 5)).toThrow();
  });

  it("parsePageRanges: invalid syntax throws", () => {
    expect(() => parsePageRanges("abc", 5)).toThrow();
    expect(() => parsePageRanges("1.5", 5)).toThrow();
  });

  it("pdfBytesToBlob: returns a PDF-typed Blob", () => {
    const blob = pdfBytesToBlob(new Uint8Array([1, 2, 3]));
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(3);
  });
});
