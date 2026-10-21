import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  detectImageFormat,
  detectBlobFormat,
  encodeCanvasToBlob,
  ImageEncodeError,
  type ImageFormat,
} from "@/lib/image-encode";

/* ── Magic numbers ──────────────────────────────────────── */

const PNG_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
]);
const WEBP_BYTES: Uint8Array<ArrayBuffer> = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectImageFormat", () => {
  it("identifies PNG, JPEG and WebP by magic bytes", () => {
    expect(detectImageFormat(PNG_BYTES)).toBe("png");
    expect(detectImageFormat(JPEG_BYTES)).toBe("jpeg");
    expect(detectImageFormat(WEBP_BYTES)).toBe("webp");
  });

  it("returns unknown for anything else", () => {
    expect(detectImageFormat(new Uint8Array([0x00, 0x01, 0x02]))).toBe("unknown");
    expect(detectImageFormat(new Uint8Array())).toBe("unknown");
  });

  it("does not treat a RIFF container that is not WebP as WebP", () => {
    const riffWav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(detectImageFormat(riffWav)).toBe("unknown");
  });

  it("needs enough bytes before deciding", () => {
    expect(detectImageFormat(new Uint8Array([0x89, 0x50]))).toBe("unknown");
    expect(detectImageFormat(WEBP_BYTES.subarray(0, 11))).toBe("unknown");
  });
});

describe("detectBlobFormat", () => {
  it("reads the blob header", async () => {
    expect(await detectBlobFormat(new Blob([PNG_BYTES]))).toBe("png");
    expect(await detectBlobFormat(new Blob([WEBP_BYTES]))).toBe("webp");
  });
});

/* ── encodeCanvasToBlob ─────────────────────────────────── */

/** Fake canvas: toBlob yields the given bytes, getContext returns a stub. */
function fakeCanvas(bytes: Uint8Array<ArrayBuffer>) {
  return {
    width: 2,
    height: 2,
    toBlob(cb: (b: Blob | null) => void) {
      cb(new Blob([bytes]));
    },
    getContext() {
      return {
        getImageData: () => ({ data: new Uint8ClampedArray(16), width: 2, height: 2 }),
      };
    },
  } as unknown as HTMLCanvasElement;
}

const encodeMock = vi.fn(
  async (imageData: ImageData, options?: { quality?: number }) => {
    void imageData;
    void options;
    return WEBP_BYTES.buffer.slice(0);
  },
);

vi.mock("@jsquash/webp", () => ({
  encode: (imageData: ImageData, options?: { quality?: number }) =>
    encodeMock(imageData, options),
}));

describe("encodeCanvasToBlob", () => {
  beforeEach(() => {
    encodeMock.mockClear();
  });

  it("returns the native blob when the format matches", async () => {
    const canvas = fakeCanvas(WEBP_BYTES);
    const blob = await encodeCanvasToBlob(canvas, "image/webp", 0.8);
    expect(await detectBlobFormat(blob)).toBe("webp");
    // Native encoding is enough — no WASM encoder needed.
    expect(encodeMock).not.toHaveBeenCalled();
  });

  it("re-encodes with the WASM encoder when the browser returns PNG for a WebP request (Safari)", async () => {
    // Safari's canvas.toBlob('image/webp') silently produces PNG bytes.
    const canvas = fakeCanvas(PNG_BYTES);
    const blob = await encodeCanvasToBlob(canvas, "image/webp", 0.8);
    expect(await detectBlobFormat(blob)).toBe("webp");
    expect(blob.type).toBe("image/webp");
    expect(encodeMock).toHaveBeenCalledOnce();
  });

  it("maps the 0–1 canvas quality onto libwebp's 0–100 scale", async () => {
    const canvas = fakeCanvas(PNG_BYTES);
    await encodeCanvasToBlob(canvas, "image/webp", 0.62);
    expect(encodeMock).toHaveBeenCalledWith(expect.anything(), { quality: 62 });
  });

  it("keeps PNG and JPEG native (no WASM encoder)", async () => {
    const png = await encodeCanvasToBlob(fakeCanvas(PNG_BYTES), "image/png", 1);
    expect(await detectBlobFormat(png)).toBe("png");
    const jpeg = await encodeCanvasToBlob(fakeCanvas(JPEG_BYTES), "image/jpeg", 0.9);
    expect(await detectBlobFormat(jpeg)).toBe("jpeg");
    expect(encodeMock).not.toHaveBeenCalled();
  });

  it("throws a friendly error when a PNG request comes back as another format", async () => {
    await expect(
      encodeCanvasToBlob(fakeCanvas(JPEG_BYTES), "image/png", 1),
    ).rejects.toBeInstanceOf(ImageEncodeError);
    expect(encodeMock).not.toHaveBeenCalled();
  });

  it("throws a friendly error when the WASM encoder fails", async () => {
    encodeMock.mockRejectedValueOnce(new Error("wasm boom"));
    await expect(
      encodeCanvasToBlob(fakeCanvas(PNG_BYTES), "image/webp", 0.8),
    ).rejects.toThrow(/could not encode a WebP image/i);
  });

  it("never returns a mislabeled blob", async () => {
    const formats: (ImageFormat | "unknown")[] = [];
    for (const [mime, bytes] of [
      ["image/webp", PNG_BYTES],
      ["image/png", JPEG_BYTES],
    ] as const) {
      const blob = await encodeCanvasToBlob(fakeCanvas(bytes), mime, 0.8).catch(
        () => null,
      );
      if (blob) formats.push((await detectBlobFormat(blob)) ?? "unknown");
    }
    // The WebP request produced real WebP bytes; the PNG request failed
    // loudly instead of shipping JPEG bytes as .png.
    expect(formats).toEqual(["webp"]);
  });
});
