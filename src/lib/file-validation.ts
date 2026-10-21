/**
 * Client-side file validation.
 *
 * A file's metadata is the one piece of untrusted data the app consumes,
 * so it is validated with a Zod schema. The accepted patterns follow the
 * HTML `accept` attribute: exact MIME types ("image/png"), wildcards
 * ("image/*") and extensions (".csv").
 */
import { z } from "zod";

/** Does the file match one of the accept patterns? */
export function matchesAccept(
  file: { name: string; type: string },
  patterns: string[],
): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const mime = file.type.toLowerCase();
  return patterns.some((pattern) => {
    const p = pattern.trim().toLowerCase();
    if (!p) return false;
    if (p.startsWith(".")) return ext === p;
    if (p.endsWith("/*")) return mime.startsWith(p.slice(0, -1));
    return mime === p;
  });
}

/** Split an HTML `accept` attribute value into patterns. */
export function acceptPatterns(accept: string): string[] {
  return accept
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

/** Schema for the files a tool accepts. */
export function acceptedFileSchema(accept: string, maxSizeMB: number) {
  const patterns = acceptPatterns(accept);
  return z
    .object({
      name: z.string(),
      size: z.number().int().nonnegative(),
      type: z.string(),
    })
    .superRefine((file, ctx) => {
      if (maxSizeMB > 0 && file.size > maxSizeMB * 1024 * 1024) {
        ctx.addIssue({
          code: "custom",
          message: `Exceeds ${maxSizeMB} MB limit`,
        });
      }
      if (patterns.length > 0 && !matchesAccept(file, patterns)) {
        ctx.addIssue({
          code: "custom",
          message: `Unsupported type${file.type ? ` (${file.type})` : ""} — expected: ${patterns.join(", ")}`,
        });
      }
    });
}

/**
 * Validate a file against a tool's constraints.
 * Returns the user-facing reason it was rejected, or null when it is fine.
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  accept: string,
  maxSizeMB: number,
): string | null {
  const result = acceptedFileSchema(accept, maxSizeMB).safeParse(file);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Unsupported file.";
}
