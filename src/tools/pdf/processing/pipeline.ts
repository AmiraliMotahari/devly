import type { ToolResult } from "@/types/tool";
import { formatFileSize } from "@/lib/file-security";
import { loadPdfjs } from "../pdfjs";
import { zipBlobs } from "@/tools/files/processing/pipeline";
export { zipBlobs };
import { friendlyPdfError } from "./errors";
import type { OnProgress, SplitMode } from "./model";

export { friendlyPdfError };

export async function loadPdfLib(bytes: ArrayBuffer) {
  const { PDFDocument } = await import("pdf-lib");
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export async function createPdfDoc() {
  const { PDFDocument } = await import("pdf-lib");
  return PDFDocument.create();
}

export function pdfBytesToBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export function parsePageRanges(input: string, totalPages: number): number[] {
  const pages: number[] = [];
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const match = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid range: "${part}"`);
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    if (start < 1 || end > totalPages || start > end) {
      throw new Error(`Range "${part}" is out of bounds (${totalPages} pages)`);
    }
    for (let i = start; i <= end; i++) pages.push(i - 1);
  }
  return pages;
}

// --- merge ---
export async function mergePdfs(files: File[], onProgress: OnProgress): Promise<ToolResult> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress(Math.round((i / files.length) * 80));
    const bytes = await files[i].arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  onProgress(90);
  const mergedBytes = await merged.save();
  const blob = pdfBytesToBlob(new Uint8Array(mergedBytes));
  onProgress(100);
  return { filename: "merged.pdf", blob, outputSize: blob.size };
}

// --- split ---
export async function splitPdf(
  file: File,
  mode: SplitMode,
  ranges: string,
  interval: number,
  onProgress: OnProgress,
): Promise<ToolResult[]> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  const splitPlans: number[][] = [];
  if (mode === "ranges") {
    const parts = ranges.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = part.match(/^(\d+)(?:-(\d+))?$/)!;
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : start;
      const group: number[] = [];
      for (let i = start; i <= end; i++) group.push(i - 1);
      splitPlans.push(group);
    }
  } else if (mode === "each") {
    for (let i = 0; i < totalPages; i++) splitPlans.push([i]);
  } else if (mode === "interval") {
    const step = Math.max(1, interval);
    for (let i = 0; i < totalPages; i += step) {
      const pages: number[] = [];
      for (let j = i; j < Math.min(i + step, totalPages); j++) pages.push(j);
      splitPlans.push(pages);
    }
  }

  const allResults: ToolResult[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < splitPlans.length; i++) {
    const pages = splitPlans[i];
    onProgress(Math.round((i / splitPlans.length) * 90));
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(doc, pages);
    copiedPages.forEach((page) => newDoc.addPage(page));
    const newBytes = await newDoc.save();
    const blob = pdfBytesToBlob(new Uint8Array(newBytes));
    const pageLabel =
      pages.length === 1
        ? `page-${pages[0] + 1}`
        : `pages-${pages[0] + 1}-${pages[pages.length - 1] + 1}`;
    allResults.push({
      filename: `${baseName}_${pageLabel}.pdf`,
      blob,
      outputSize: blob.size,
    });
  }

  onProgress(100);
  return allResults;
}

// --- compress ---
export async function compressPdf(file: File, level: string, onProgress: OnProgress): Promise<ToolResult> {
  const originalBytes = await file.arrayBuffer();
  const doc = await loadPdfLib(originalBytes);

  onProgress(20);
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");

  onProgress(50);
  const useObjectStreams = level !== "low";
  const compressedBytes = await doc.save({ useObjectStreams });

  onProgress(80);
  const grew = compressedBytes.byteLength >= originalBytes.byteLength;
  const finalBytes: Uint8Array = grew
    ? new Uint8Array(originalBytes)
    : new Uint8Array(compressedBytes);
  const blob = pdfBytesToBlob(finalBytes);

  const savings = ((file.size - blob.size) / file.size) * 100;
  const savedBytes = file.size - blob.size;
  onProgress(90);

  onProgress(100);
  return {
    filename: file.name,
    blob,
    originalSize: file.size,
    outputSize: blob.size,
    metadata: {
      "Original size": formatFileSize(file.size),
      "Compressed size": formatFileSize(blob.size),
      ...(grew
        ? { Note: "Already fully optimized — original file returned unchanged." }
        : {
            "Space saved": `${formatFileSize(Math.max(0, savedBytes))} (${Math.max(0, savings).toFixed(1)}%)`,
          }),
      "Compression level": level,
    },
  };
}

// --- rotate ---
export async function rotatePdf(
  file: File,
  angle: string,
  pageRanges: string,
  allPages: boolean,
  onProgress: OnProgress,
): Promise<ToolResult> {
  const bytes = await file.arrayBuffer();
  const doc = await loadPdfLib(bytes);
  const pages = doc.getPages();
  const totalPages = pages.length;

  onProgress(40);
  const pagesToRotate: number[] = [];
  if (allPages) {
    for (let i = 0; i < totalPages; i++) pagesToRotate.push(i);
  } else if (pageRanges.trim()) {
    pagesToRotate.push(...parsePageRanges(pageRanges, totalPages));
  }

  onProgress(60);
  const rotation = parseInt(angle, 10);
  for (let i = 0; i < pagesToRotate.length; i++) {
    const pageIdx = pagesToRotate[i];
    const page = pages[pageIdx];
    const currentRotation = page.getRotation().angle;
    const newRotation = (currentRotation + rotation) % 360;
    const { degrees } = await import("pdf-lib");
    page.setRotation(degrees(newRotation));
    onProgress(60 + Math.round((i / Math.max(1, pagesToRotate.length)) * 30));
  }

  onProgress(90);
  const rotatedBytes = await doc.save();
  const blob = pdfBytesToBlob(new Uint8Array(rotatedBytes));

  onProgress(100);
  return {
    filename: file.name,
    blob,
    originalSize: file.size,
    outputSize: blob.size,
    metadata: {
      "Pages rotated": `${pagesToRotate.length} of ${totalPages}`,
      "Rotation": `${angle}°`,
    },
  };
}

// --- pdf to images ---
export async function pdfToImages(
  file: File,
  format: string,
  dpi: number,
  onProgress: OnProgress,
): Promise<ToolResult> {
  const ext = format === "png" ? "png" : "jpg";
  const pdfjsLib = await loadPdfjs();
  const bytes = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const doc = await loadingTask.promise;

  const results: ToolResult[] = [];
  const scale = dpi / 72;
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(Math.round((i / doc.numPages) * 80));
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context.");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const mime = format === "png" ? "image/png" : "image/jpeg";
    const quality = format === "png" ? 1 : 0.92;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), mime, quality);
    });

    results.push({
      filename: `${baseName}_page_${i}.${ext}`,
      blob,
      outputSize: blob.size,
    });
  }

  onProgress(90);
  if (results.length === 1) {
    onProgress(100);
    return {
      filename: results[0].filename,
      blob: results[0].blob,
      originalSize: file.size,
      outputSize: results[0].blob.size,
      metadata: { "Pages rendered": doc.numPages.toString(), Format: format.toUpperCase() },
    };
  }

  const zipBlob = await zipBlobs(results);
  onProgress(100);
  return {
    filename: `${baseName}-images.zip`,
    blob: zipBlob,
    originalSize: file.size,
    outputSize: zipBlob.size,
    metadata: { "Pages rendered": doc.numPages.toString(), Format: format.toUpperCase() },
  };
}

// --- extract images ---
export async function extractImages(file: File, onProgress: OnProgress): Promise<ToolResult> {
  const { PDFDocument, PDFName, PDFStream } = await import("pdf-lib");
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const results: ToolResult[] = [];
  const pages = doc.getPages();

  for (let pi = 0; pi < pages.length; pi++) {
    onProgress(Math.round((pi / pages.length) * 80));
    const page = pages[pi];
    const resources = page.node.Resources();
    if (!resources) continue;
    const xobjects = resources.get(PDFName.of("XObject"));
    if (!xobjects) continue;

    const dict = xobjects as { entries?: () => Iterable<[unknown, unknown]> };
    if (!dict.entries) continue;

    for (const [name, ref] of dict.entries()) {
      void name;
      const obj = doc.context.lookup(ref as never);
      if (!(obj instanceof PDFStream)) continue;
      const subtype = obj.dict.get(PDFName.of("Subtype"));
      if (subtype !== PDFName.of("Image")) continue;

      const filter = obj.dict.get(PDFName.of("Filter"));

      let blob: Blob | null = null;
      const rawBytes = (obj as { getContents: () => Uint8Array }).getContents();

      if (filter === PDFName.of("DCTDecode")) {
        blob = new Blob([new Uint8Array(rawBytes)], { type: "image/jpeg" });
      } else if (filter === PDFName.of("JPXDecode")) {
        blob = new Blob([new Uint8Array(rawBytes)], { type: "image/jp2" });
      }

      if (blob) {
        const idx = results.length + 1;
        results.push({
          filename: `page${pi + 1}-img${idx}.${filter === PDFName.of("DCTDecode") ? "jpg" : "jp2"}`,
          blob,
          outputSize: blob.size,
        });
      }
    }
  }

  onProgress(90);
  if (results.length === 0) {
    throw new Error("No embedded images found in this PDF.");
  }
  const zipBlob = await zipBlobs(results);
  onProgress(100);

  const baseName = file.name.replace(/\.pdf$/i, "");
  return {
    filename: `${baseName}-images.zip`,
    blob: zipBlob,
    outputSize: zipBlob.size,
    metadata: { "Images extracted": results.length.toString() },
  };
}

// --- images to pdf ---
export async function imagesToPdf(files: File[], onProgress: OnProgress): Promise<ToolResult> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress(Math.round((i / files.length) * 85));
    const bytes = await files[i].arrayBuffer();
    let embedded;
    if (/\.png$/i.test(files[i].name) || files[i].type === "image/png") {
      embedded = await pdf.embedPng(bytes);
    } else {
      embedded = await pdf.embedJpg(bytes);
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }
  onProgress(92);
  const pdfBytes = await pdf.save();
  const blob = pdfBytesToBlob(new Uint8Array(pdfBytes));
  onProgress(100);
  return { filename: "images.pdf", blob, outputSize: blob.size };
}

// --- pdf to text ---
export async function pdfToText(file: File, onProgress: OnProgress): Promise<ToolResult> {
  const pdfjsLib = await loadPdfjs();
  const bytes = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const doc = await loadingTask.promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(Math.round((i / doc.numPages) * 90));
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str;
      if (!item.str.endsWith(" ")) line += " ";
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    parts.push(`--- Page ${i} ---\n${lines.filter((l) => l.length > 0).join("\n")}`);
  }

  onProgress(100);
  const text = parts.join("\n\n");
  return {
    filename: file.name.replace(/\.pdf$/i, "") + ".txt",
    blob: new Blob([text], { type: "text/plain" }),
    outputSize: new Blob([text]).size,
  };
}

