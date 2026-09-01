import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonSchema = {
  type?: string | string[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  [key: string]: unknown;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URI_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

function inferFormat(value: string): string | undefined {
  if (EMAIL_RE.test(value)) return "email";
  if (UUID_RE.test(value)) return "uuid";
  if (URI_RE.test(value)) return "uri";
  if (IPV4_RE.test(value)) return "ipv4";
  if (DATETIME_RE.test(value)) return "date-time";
  if (DATE_RE.test(value)) return "date";
  return undefined;
}

function buildSchema(
  value: unknown,
  detectFormat: boolean,
  inferRequired: boolean,
): JsonSchema {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: {} };
    const itemSchemas = value.map((v) =>
      buildSchema(v, detectFormat, inferRequired),
    );
    const first = itemSchemas[0];
    const homogeneous = itemSchemas.every(
      (s) => JSON.stringify(s) === JSON.stringify(first),
    );
    return {
      type: "array",
      items: homogeneous ? first : { oneOf: itemSchemas },
    };
  }
  if (typeof value === "object") {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      properties[k] = buildSchema(v, detectFormat, inferRequired);
      if (inferRequired) required.push(k);
    }
    const schema: JsonSchema = { type: "object", properties };
    if (inferRequired && required.length > 0) schema.required = required;
    return schema;
  }
  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "string") {
    const schema: JsonSchema = { type: "string" };
    if (detectFormat) {
      const fmt = inferFormat(value);
      if (fmt) schema.format = fmt;
    }
    return schema;
  }
  return {};
}

export function JsonToJsonSchemaTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [inferRequired, setInferRequired] = useState(true);
  const [detectFormat, setDetectFormat] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      const schema = buildSchema(parsed, detectFormat, inferRequired);
      const wrapped = {
        $schema: "http://json-schema.org/draft-07/schema#",
        ...schema,
      };
      setOutput(JSON.stringify(wrapped, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schema");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.json";
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
          placeholder='Paste your JSON data, e.g. {"name":"John","age":30,"email":"john@example.com"}'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inferRequired}
              onChange={(e) => setInferRequired(e.target.checked)}
            />
            Mark All Properties Required
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={detectFormat}
              onChange={(e) => setDetectFormat(e.target.checked)}
            />
            Detect String Formats (email, date, uri, uuid, ipv4)
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConvert}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generate Schema
        </button>
        {output && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download Schema
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">JSON Schema Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
