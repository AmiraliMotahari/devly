import { describe, expect, it } from "vitest";
import { friendlyError } from "@/tools/image/processing/errors";

describe("friendlyError", () => {
  it("maps known library/browser errors to friendly copy", () => {
    expect(friendlyError(new Error("canvas is tainted"))).toMatch(/security restriction/i);
    expect(friendlyError(new Error("createImageBitmap failed"))).toMatch(/could not be decoded/i);
    expect(friendlyError(new Error("out of memory"))).toMatch(/memory/i);
    expect(friendlyError(new Error("Encoding the image failed"))).toMatch(/saving the image/i);
  });

  it("keeps short, clean Error messages", () => {
    expect(friendlyError(new Error("No images to merge."))).toBe("No images to merge.");
  });

  it("trims long messages to the fallback", () => {
    const long = new Error("x".repeat(300));
    expect(friendlyError(long, "Fallback used.")).toBe("Fallback used.");
  });

  it("handles strings and unknown throws", () => {
    expect(friendlyError("Simple failure")).toBe("Simple failure");
    expect(friendlyError(42)).toBe("Something went wrong.");
    expect(friendlyError(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("never leaks stack traces", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at internalModule (file:///x/y.js:1:1)";
    const out = friendlyError(err);
    expect(out).not.toMatch(/at internalModule/);
    expect(out).not.toMatch(/file:\/\/\//);
  });
});
