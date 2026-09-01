"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolCheckbox,
  ToolContainer,
  ToolError,
  ToolInput,
  ToolOutput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";

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

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolContainer>
      <ToolInput
        id="json-input"
        label="JSON Input"
        value={input}
        onChange={setInput}
        placeholder='Array of objects: [{"name":"John","age":30},{"name":"Jane","age":25}]'
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Dialect"
          value={dialect}
          onValueChange={(v) => setDialect(v as Dialect)}
          options={[
            { label: "PostgreSQL", value: "postgres" },
            { label: "MySQL", value: "mysql" },
            { label: "SQLite", value: "sqlite" },
          ]}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="table-name" className="text-sm font-medium">
            Table Name
          </label>
          <Input
            id="table-name"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="w-44 font-mono"
          />
        </div>
        <ToolCheckbox
          label="Include DROP TABLE"
          checked={includeDrop}
          onCheckedChange={setIncludeDrop}
        />
        <ToolCheckbox
          label="Include CREATE TABLE"
          checked={includeCreate}
          onCheckedChange={setIncludeCreate}
        />
        <ToolCheckbox
          label="Batch INSERT"
          checked={batchInserts}
          onCheckedChange={setBatchInserts}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleConvert}
        onClear={handleClear}
        runLabel="Generate SQL"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="sql-output"
          label="SQL Output"
          value={output}
          filename="output.sql"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
