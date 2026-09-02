export type CsvSeparator = "," | ";" | "tab" | "|";

export function normalizeSeparator(sep: CsvSeparator): string {
  return sep === "tab" ? "\t" : sep;
}

function splitCsvLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Doubled quote inside a quoted field is a literal quote.
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
      continue;
    }

    if (char === '"' && current === "") {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === sep) {
      fields.push(current);
      current = "";
      i++;
      continue;
    }

    current += char;
    i++;
  }

  fields.push(current);
  return fields;
}

export function csvToArray(
  text: string,
  sep: string = ",",
  hasHeaders: boolean = true,
): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const rows = lines.map((line) => splitCsvLine(line, sep));

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

export function escapeCsvValue(value: unknown, sep: string): string {
  const str =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : String(value);

  const needsQuoting =
    str.includes(sep) ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r");
  if (needsQuoting) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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
