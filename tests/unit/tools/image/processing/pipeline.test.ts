import { describe, it, expect } from "vitest";
import { outputTypeForExt } from "@/tools/image/processing/pipeline";

describe("image/processing pipeline", () => {
  it("outputTypeForExt: maps extensions correctly", () => {
    expect(outputTypeForExt("png")).toEqual({ type: "image/png", ext: "png" });
    expect(outputTypeForExt("jpg")).toEqual({ type: "image/jpeg", ext: "jpg" });
    expect(outputTypeForExt("jpeg")).toEqual({ type: "image/jpeg", ext: "jpeg" });
    expect(outputTypeForExt("webp")).toEqual({ type: "image/webp", ext: "webp" });
  });
});
