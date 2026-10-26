import type { ToolResult, ProcessingContext } from "@/types/tool";
import { replaceExtension, getExtension } from "@/lib/file-security";
import { encodeCanvasToBlob } from "@/lib/image-encode";

export type DecodeOptions = { maxPixels?: number };

export async function decodeToCanvas(file: File, options?: DecodeOptions) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not create canvas context.");
  }
  ctx.imageSmoothingQuality = "high";
  if (options?.maxPixels && options.maxPixels > 0) {
    const scale = Math.min(1, Math.sqrt(options.maxPixels / (bitmap.width * bitmap.height)));
    if (scale < 1) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(bitmap, 0, 0);
    }
  } else {
    ctx.drawImage(bitmap, 0, 0);
  }
  bitmap.close();
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

export function outputTypeForExt(ext: string, mimeHint?: string): { type: string; ext: string } {
  const e = ext.toLowerCase().replace(/^\.+/, "");
  if (e === "png") return { type: "image/png", ext: "png" };
  if (e === "webp") return { type: "image/webp", ext: "webp" };
  if (e === "jpg" || e === "jpeg") return { type: "image/jpeg", ext: e === "jpeg" ? "jpeg" : "jpg" };
  return { type: mimeHint || "image/jpeg", ext: e || "jpg" };
}

export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  outputType: string,
  quality: number,
): Promise<Blob> {
  return encodeCanvasToBlob(canvas, outputType, quality);
}

export async function convertImage(
  file: File,
  quality: number,
  outputType: string,
  outputExt: string,
  ctx: ProcessingContext,
): Promise<ToolResult> {
  const { canvas } = await decodeToCanvas(file);
  const context = canvas.getContext("2d");
  if (context && outputType === "image/jpeg") {
    // white background for jpg conversion
    const img = context.getImageData(0, 0, canvas.width, canvas.height);
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext("2d");
    if (tctx) {
      tctx.fillStyle = "white";
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(canvas, 0, 0);
      canvas.width = tmp.width;
      canvas.height = tmp.height;
      const c = canvas.getContext("2d");
      if (c) c.drawImage(tmp, 0, 0);
    }
    void img;
  }
  ctx.onProgress(60, "Converting...");

  const blob = await encodeCanvasToBlob(canvas, outputType, quality / 100);

  ctx.onProgress(90, "Finalizing...");

  return {
    filename: replaceExtension(file.name, outputExt),
    blob,
    originalSize: file.size,
    outputSize: blob.size,
  };
}

export function friendlyImageError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export { getExtension, replaceExtension };
