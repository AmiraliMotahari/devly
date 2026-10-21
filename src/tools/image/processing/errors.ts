/**
 * Error hygiene for the Advanced Image Editor.
 *
 * `friendlyError` maps raw library/browser errors to actionable user-facing
 * messages (no stack traces or library internals in toasts), and
 * `reconcileRegistry` releases decoded bitmaps that no current, past, or
 * future (redo) project snapshot references — keeping the registry in sync
 * with the reachable history graph. Both are pure and unit-tested.
 */

/** Common user-facing failure messages, keyed by known error signatures. */
const FRIENDLY_PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /canvas (is|was) (tainted|not available)|SecurityError/i,
    message: "The image could not be processed because of a browser security restriction. Try re-importing the file.",
  },
  {
    test: /createImageBitmap|decode|invalid image|unsupported/i,
    message: "The image could not be decoded. The file may be corrupt or in an unsupported format.",
  },
  {
    test: /out of memory|allocation failed/i,
    message: "Your browser ran out of memory for this operation. Try a smaller image or export at a lower scale.",
  },
  {
    test: /encoding the image|toBlob/i,
    message: "Saving the image failed. Try a different format or a smaller size.",
  },
  {
    test: /zip|JSZip/i,
    message: "Packaging the ZIP archive failed. Try exporting fewer files at once.",
  },
  {
    test: /WebGL|OffscreenCanvas/i,
    message: "Background removal is unavailable in this browser. Try Chrome or Edge.",
  },
];

/**
 * Convert any thrown value into a short, safe, user-facing message.
 * Known library errors are mapped to friendly copy; unknown Errors keep a
 * trimmed message; non-Error throws become a generic fallback. Never
 * exposes raw internals (stacks, internal paths) to the UI.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error) {
    for (const { test, message } of FRIENDLY_PATTERNS) {
      if (test.test(err.message)) return message;
    }
    const msg = err.message.trim();
    if (msg.length > 0 && msg.length <= 140) return msg;
    return fallback;
  }
  if (typeof err === "string" && err.trim().length > 0 && err.length <= 140) {
    return err.trim();
  }
  return fallback;
}
