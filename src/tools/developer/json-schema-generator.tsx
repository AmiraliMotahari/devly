import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type Schema = {
  type?: string | string[];
  format?: string;
  pattern?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
};

function inferType(value: JsonValue, detectFormat: boolean): Schema {
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { type: "integer" };
    return { type: "number" };
  }
  if (typeof value === "string") {
    if (!detectFormat) return { type: "string" };
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
      return { type: "string", format: "email" };
    if (/^https?:\/\//.test(value)) return { type: "string", format: "uri" };
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))
      return { type: "string", format: "date-time" };
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { type: "string", format: "date" };
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value))
      return { type: "string", format: "uuid" };
    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return { type: "string", pattern: "^#[0-9a-fA-F]{3,8}$" };
    return { type: "string" };
  }
  if (Array.isArray(value)) return { type: "array" };
  if (typeof value === "object") return { type: "object" };
  return { type: "string" };
}

function mergeSchemas(a: Schema, b: Schema): Schema {
  if (JSON.stringify(a) === JSON.stringify(b)) return a;
  if (a.type !== b.type) {
    const aTypes = Array.isArray(a.type) ? a.type : [a.type];
    const bTypes = Array.isArray(b.type) ? b.type : [b.type];
    return { type: [...new Set([...aTypes, ...bTypes])] };
  }
  if (a.type === "object" && b.type === "object") {
    const merged: Schema = { type: "object", properties: { ...(a.properties || {}) } };
    for (const key of Object.keys(b.properties || {})) {
      const aProp = (a.properties || {})[key];
      const bProp = (b.properties || {})[key];
      if (aProp && bProp) {
        (merged.properties as Record<string, Schema>)[key] = mergeSchemas(aProp, bProp);
      } else if (bProp) {
        (merged.properties as Record<string, Schema>)[key] = bProp;
      }
    }
    return merged;
  }
  if (a.type === "array" && b.type === "array" && a.items && b.items) {
    return { type: "array", items: mergeSchemas(a.items, b.items) };
  }
  return { type: a.type, format: a.format || b.format };
}

function buildSchema(samples: JsonValue[], required: boolean, detectFormat: boolean): Schema {
  if (samples.length === 0) return {};
  if (samples.length === 1) return buildSingleSchema(samples[0], required, detectFormat);

  let schema = buildSingleSchema(samples[0], required, detectFormat);
  for (let i = 1; i < samples.length; i++) {
    const next = buildSingleSchema(samples[i], required, detectFormat);
    schema = mergeSchemas(schema, next);
  }
  return schema;
}

function buildSingleSchema(value: JsonValue, required: boolean, detectFormat: boolean): Schema {
  if (value === null) return { type: "null" };
  if (typeof value !== "object" || Array.isArray(value) === false && typeof value === "object") {
    if (typeof value !== "object") return inferType(value, detectFormat);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array" };
    return {
      type: "array",
      items: buildSchema(value, required, detectFormat),
    };
  }

  if (typeof value === "object" && value !== null) {
    const properties: Record<string, Schema> = {};
    const requiredFields: string[] = [];
    for (const [key, val] of Object.entries(value)) {
      properties[key] = buildSchema([val as JsonValue], required, detectFormat);
      if (required) requiredFields.push(key);
    }
    const schema: Schema = { type: "object", properties };
    if (required && requiredFields.length > 0) {
      schema.required = requiredFields;
    }
    return schema;
  }

  return inferType(value, detectFormat);
}

export function JsonSchemaGenerator({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [required, setRequired] = useState(true);
  const [detectFormat, setDetectFormat] = useState(true);
  const [error, setError] = useState("");

  const handleGenerate = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed: JsonValue = JSON.parse(input);
      const samples = Array.isArray(parsed) ? parsed : [parsed];
      const schema = buildSchema(samples, required, detectFormat);
      const finalSchema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        ...schema,
      };
      setOutput(JSON.stringify(finalSchema, null, 2));
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
          placeholder='Paste your JSON data, e.g. {"name":"John","age":30}'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Mark required fields
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={detectFormat}
            onChange={(e) => setDetectFormat(e.target.checked)}
          />
          Detect formats (email, URI, date, etc.)
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
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
