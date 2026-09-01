import type { Color } from "culori";

/**
 * Round every numeric channel of a culori color to `p` decimals.
 * (culori's `round()` only maps plain numbers, not color objects.)
 */
export function roundColor<T extends Color>(color: T, p: number): T {
  const factor = Math.pow(10, p);
  const out = { ...color } as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === "number") {
      out[k] = Math.round(v * factor) / factor;
    }
  }
  return out as T;
}
