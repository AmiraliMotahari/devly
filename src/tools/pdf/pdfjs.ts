"use client";

/**
 * Loads pdf.js with a locally served worker so PDF processing never
 * reaches out to a CDN.
 *
 * The worker file is a pinned copy of pdfjs-dist's worker (see
 * public/pdf.worker.min.mjs — must match the pdfjs-dist version).
 *
 * We construct the Worker ourselves and hand it over via `workerPort`
 * because bundlers that shim `process` (Next.js/Turbopack) make pdf.js
 * misdetect a Node.js environment and silently fall back to a fake
 * worker on the main thread. If worker construction fails, we let
 * pdf.js fall back — still fully offline, just single-threaded.
 */
const LOCAL_WORKER_PATH = "/pdf.worker.min.mjs";

export async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");

  if (
    !pdfjsLib.GlobalWorkerOptions.workerPort &&
    !pdfjsLib.GlobalWorkerOptions.workerSrc
  ) {
    try {
      const worker = new Worker(LOCAL_WORKER_PATH, { type: "module" });

      // Verify the worker actually booted before wiring it in, so a
      // broken copy falls back cleanly instead of hanging.
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("pdf.js worker did not start"));
        }, 5_000);
        const cleanup = () => {
          clearTimeout(timeout);
          worker.removeEventListener("message", onReady);
          worker.removeEventListener("error", onError);
        };
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          worker.terminate();
          reject(new Error("pdf.js worker failed to start"));
        };
        worker.addEventListener("message", onReady);
        worker.addEventListener("error", onError);
      });

      pdfjsLib.GlobalWorkerOptions.workerPort = worker;
    } catch {
      // Main-thread fallback (pdf.js "fake worker"). Still offline.
    }
  }

  return pdfjsLib;
}
