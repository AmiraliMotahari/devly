import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type Dialect = "postgres" | "mysql" | "sqlite";

function sqlType(value: unknown, dialect: Dialect): string {
  if (value === null) return "TEXT";
  if (Array.isArray(value) || typeof value === "object") {
    if (dialect === "mysql") return "JSON";
    return "TEXT";
  }
  if (typeof value === "boolean") {
    if (dialect === "mysql") return "TINYINT(1)";
    if (dialect === "sqlite") return "INTEGER";
    return "BOOLEAN";
  }
  if (Number.isInteger(value as number)) {
    if (dialect === "mysql") return "BIGINT";
    if (dialect === "sqlite") return "INTEGER";
    return "INTEGER";
  }
  if (typeof value === "number") {
    if (dialect === "mysql") return "DOUBLE";
    if (dialect === "sqlite") return "REAL";
    return "NUMERIC";
  }
  return "TEXT";
}

function quote(value: unknown, dialect: Dialect): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") {
    return dialect === "postgres" ? (value ? "TRUE" : "FALSE") : value ? "1" : "0";
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return `'${value.replace(/'/g, dialect === "mysql" ? "\\'" : "''")}'`;
  return `'${JSON.stringify(value).replace(/'/g, dialect === "mysql" ? "\\'" : "''")}'`;
}

function quoteId(name: string, dialect: Dialect): string {
  if (dialect === "mysql") return `\`${name}\``;
  if (dialect === "sqlite") return `"${name}"`;
  return `"${name}"`;
}

function generateSQL(
  data: Record<string, unknown>[],
  tableName: string,
  dialect: Dialect,
  includeDrop: boolean,
  includeCreate: boolean,
  batchInserts: boolean,
): string {
  if (data.length === 0) return "-- No data provided";

  const allKeys = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) allKeys.add(key);
  }
  const columns = Array.from(allKeys);

  const colDefs = columns
    .map((col) => `  ${quoteId(col, dialect)} ${sqlType(data[0][col], dialect)}`)
    .join(",\n");

  const parts: string[] = [];

  if (includeDrop)
    parts.push(
      `DROP TABLE IF EXISTS ${quoteId(tableName, dialect)};\n`,
    );

  if (includeCreate)
    parts.push(
      `CREATE TABLE ${quoteId(tableName, dialect)} (\n${colDefs}\n);\n`,
    );

  if (batchInserts) {
    const rows = data
      .map((row) =>
        `  (${columns.map((c) => quote(row[c] ?? null, dialect)).join(", ")})`,
      )
      .join(",\n");
    parts.push(
      `INSERT INTO ${quoteId(tableName, dialect)} (${columns.map((c) => quoteId(c, dialect)).join(", ")})\nVALUES\n${rows};\n`,
    );
  } else {
    for (const row of data) {
      const vals = columns.map((c) => quote(row[c] ?? null, dialect)).join(", ");
      parts.push(
        `INSERT INTO ${quoteId(tableName, dialect)} (${columns.map((c) => quoteId(c, dialect)).join(", ")})\nVALUES (${vals});\n`,
      );
    }
  }

  return parts.join("\n");
}

export function JsonToSqlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [tableName, setTableName] = useState("my_table");
  const [dialect, setDialect] = useState<Dialect>("postgres");
  const [includeDrop, setIncludeDrop] = useState(false);
  const [includeCreate, setIncludeCreate] = useState(true);
  const [batchInserts, setBatchInserts] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      let parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) parsed = [parsed];
      if (typeof parsed[0] !== "object" || parsed[0] === null) {
        setError("JSON must be an object or an array of objects");
        return;
      }

      const sql = generateSQL(
        parsed as Record<string, unknown>[],
        tableName || "my_table",
        dialect,
        includeDrop,
        includeCreate,
        batchInserts,
      );
      setOutput(sql);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SQL");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">JSON Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Array of objects: [{"name":"John","age":30},{"name":"Jane","age":25}]'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Dialect</label>
          <select
            value={dialect}
            onChange={(e) => setDialect(e.target.value as Dialect)}
            className="p-2 border rounded"
          >
            <option value="postgres">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Table Name</label>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="p-2 border rounded font-mono text-sm"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDrop}
              onChange={(e) => setIncludeDrop(e.target.checked)}
            />
            Include DROP TABLE
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeCreate}
              onChange={(e) => setIncludeCreate(e.target.checked)}
            />
            Include CREATE TABLE
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={batchInserts}
              onChange={(e) => setBatchInserts(e.target.checked)}
            />
            Batch INSERT
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConvert}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generate SQL
        </button>
        {output && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download SQL
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">SQL Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
