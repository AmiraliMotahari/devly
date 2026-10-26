import { describe, it, expect, vi } from "vitest";
import { createArchive, extractArchive, computeFileHashes, zipBlobs, friendlyFileError } from "@/tools/files/processing/pipeline";

describe("files/processing pipeline", () => {
  it("createArchive: produces a ZIP blob with all files", async () => {
    const files = [
      new File(["hello"], "a.txt", { type: "text/plain" }),
      new File(["world"], "b.txt", { type: "text/plain" }),
    ];
    const { filename, blob } = await createArchive(files, vi.fn());
    expect(filename).toBe("archive.zip");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("extractArchive: extracts entries and returns ToolResult[]", async () => {
    const files = [
      new File(["hello"], "a.txt", { type: "text/plain" }),
      new File(["world"], "b.txt", { type: "text/plain" }),
    ];
    const { blob } = await createArchive(files, vi.fn());
    const zipFile = new File([blob], "test.zip", { type: "application/zip" });

    const { results, renamedCount } = await extractArchive(zipFile, vi.fn());
    expect(results.length).toBe(2);
    expect(renamedCount).toBe(0);
    expect(results[0].filename).toMatch(/^a\.txt$/);
    expect(results[1].filename).toMatch(/^b\.txt$/);
  });

  it("computeFileHashes: md5 and sha256 match known vectors", async () => {
    const file = new File([""], "empty.txt", { type: "text/plain" });
    const hashes = await computeFileHashes(file, "all");
    expect(hashes.md5).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(hashes.sha256).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("computeFileHashes: single algorithm returns only that hash", async () => {
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const hashes = await computeFileHashes(file, "sha256");
    expect(hashes.sha256).toBeTruthy();
    expect(hashes.md5).toBeUndefined();
  });

  it("zipBlobs: combines ToolResult blobs into one ZIP", async () => {
    const results = [
      { filename: "a.txt", blob: new Blob(["a"]), outputSize: 1 },
      { filename: "b.txt", blob: new Blob(["b"]), outputSize: 1 },
    ];
    const blob = await zipBlobs(results);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("friendlyFileError: returns error message or fallback", async () => {
    expect(friendlyFileError(new Error("boom"), "fallback")).toBe("boom");
    expect(friendlyFileError(null, "fallback")).toBe("fallback");
    expect(friendlyFileError("string error", "fallback")).toBe("fallback");
  });
});