/**
 * Canvas encoding with output verification.
 *
 * Safari/WebKit does not implement WebP *encoding* in `canvas.toBlob()`:
 * it does not throw, it silently returns a **PNG** blob. Encoding blindly
 * therefore ships PNG bytes under a `.webp` name (and iOS Safari then saves
 * the file as `.png`). To never emit a mislabeled file we verify the
 * produced bytes by magic number and, when the browser lied, re-encode with
 * a real WebP encoder — `@jsquash/webp` (WASM libwebp, runs client-side).
 *
 * The WASM encoder is imported dynamically, so browsers with native WebP
 * support (Chrome, Firefox, Edge) never download it.
 */

export type ImageFormat = "png" | "jpeg" | "webp";

/** MIME type → expected encoded format. */
const FORMAT_BY_MIME: Record<string, ImageFormat> = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
};

/** Magic numbers for the formats we produce. */
const MAGIC = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
} as const;

/**
 * Identify encoded image bytes by their magic number.
 * Pure — unit-tested without a browser.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | "unknown" {
  if (
    bytes.length >= 4 &&
    bytes[0] === MAGIC.png[0] &&
    bytes[1] === MAGIC.png[1] &&
    bytes[2] === MAGIC.png[2] &&
    bytes[3] === MAGIC.png[3]
  ) {
    return "png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === MAGIC.jpeg[0] &&
    bytes[1] === MAGIC.jpeg[1] &&
    bytes[2] === MAGIC.jpeg[2]
  ) {
    return "jpeg";
  }
  if (bytes.length >= 12) {
    // RIFF....WEBP
    const riff = String.fromCharCode(...bytes.subarray(0, 4));
    const webp = String.fromCharCode(...bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return "webp";
  }
  return "unknown";
}

/** Read the first bytes of a blob to identify its format. */
export async function detectBlobFormat(blob: Blob): Promise<ImageFormat | "unknown"> {
  try {
    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    return detectImageFormat(head);
  } catch {
    return "unknown";
  }
}

/** Native canvas encoding. */
function nativeToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("The browser could not encode this image.")),
      mime,
      quality,
    );
  });
}

/**
 * Encode a canvas to WebP using the WASM libwebp encoder.
 * Used when the browser has no native WebP encoder (Safari/iOS).
 */
async function encodeWebpWithWasm(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context.");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { encode } = await import("@jsquash/webp");
  // libwebp quality is 0–100; the canvas API uses 0–1.
  const buffer = await encode(imageData, {
    quality: Math.max(1, Math.min(100, Math.round(quality * 100))),
  });
  return new Blob([buffer], { type: "image/webp" });
}

export class ImageEncodeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ImageEncodeError";
  }
}

/**
 * Encode a canvas to the requested MIME type, guaranteeing the bytes match
 * the requested format.
 *
 * - PNG/JPEG: native encoding is reliable everywhere; a mismatch is a bug
 *   and surfaces as an error.
 * - WebP: native encoding is used when available; otherwise the WASM
 *   encoder produces a real WebP file. A file is never mislabeled.
 *
 * @param quality 0–1 (ignored for PNG).
 */
export async function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality = 0.92,
): Promise<Blob> {
  const expected = FORMAT_BY_MIME[mime];
  let native: Blob;
  try {
    native = await nativeToBlob(canvas, mime, quality);
  } catch (err) {
    if (expected !== "webp") {
      throw new ImageEncodeError("The browser could not encode this image.", {
        cause: err,
      });
    }
    native = new Blob([], { type: mime });
  }

  if (!expected) return native;

  const actual = await detectBlobFormat(native);
  if (actual === expected) return native;

  if (expected === "webp") {
    // Safari-family browsers silently fall back to PNG — re-encode for real.
    try {
      return await encodeWebpWithWasm(canvas, quality);
    } catch (err) {
      throw new ImageEncodeError(
        "This browser could not encode a WebP image. Try converting to PNG or JPEG instead.",
        { cause: err },
      );
    }
  }

  throw new ImageEncodeError(
    `The browser encoded a ${actual === "unknown" ? "different" : actual} image instead of the requested ${expected}.`,
  );
}
