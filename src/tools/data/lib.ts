export type CsvSeparator = "," | ";" | "tab" | "|";

export function normalizeSeparator(sep: CsvSeparator): string {
  return sep === "tab" ? "\t" : sep;
}

export function csvToArray(
  text: string,
  sep: string = ",",
  hasHeaders: boolean = true,
): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const rows = lines.map((line) => {
    if (line.includes('"')) {
      return line.split(new RegExp(`(?<!")${sep}(?![^"]*")`, "g")).map((f) =>
        f.replace(/^"|"$/g, "")
      );
    }
    return line.split(sep);
  });

  if (!hasHeaders || rows.length === 0) {
    return rows.map((row) =>
      row.reduce((acc, val, j) => ({ ...acc, [`col${j + 1}`]: val }), {})
    );
  }

  const headers = rows[0].map((h) =>
    h.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "_").toLowerCase()
  );
  return rows.slice(1).map((row) =>
    headers.reduce((acc, header, j) => ({ ...acc, [header]: row[j] ?? "" }), {})
  );
}

export function escapeCsvValue(value: string, sep: string): string {
  const needsQuoting =
    value.includes(sep) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  if (needsQuoting) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = "",
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else if (value === null || value === undefined) {
      result[newKey] = "";
    } else {
      result[newKey] = String(value);
    }
  }
  return result;
}

export function jsonArrayToCsv(
  data: Record<string, unknown>[],
  separator: CsvSeparator,
  flattenNested: boolean,
  consistentColumns: boolean,
): string {
  if (data.length === 0) return "";

  const sep = normalizeSeparator(separator);
  const rows = flattenNested
    ? data.map((row) => flattenObject(row))
    : (data as Record<string, string>[]);

  const allKeys = consistentColumns
    ? Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    : Object.keys(rows[0] ?? {});

  const header = allKeys.map((k) => escapeCsvValue(k, sep)).join(sep);
  const dataRows = rows.map((row) =>
    allKeys.map((k) => escapeCsvValue(row[k] ?? "", sep)).join(sep)
  );

  return [header, ...dataRows].join("\n");
}
