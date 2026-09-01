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
} from "@/components/tool-forms";

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
    const allTypes: string[] = [];
    for (const t of [...aTypes, ...bTypes]) {
      if (t !== undefined) allTypes.push(t);
    }
    return { type: Array.from(new Set(allTypes)) };
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
        placeholder='Paste your JSON data, e.g. {"name":"John","age":30}'
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Mark required fields"
          checked={required}
          onCheckedChange={setRequired}
        />
        <ToolCheckbox
          label="Detect formats (email, URI, date, etc.)"
          checked={detectFormat}
          onCheckedChange={setDetectFormat}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleGenerate}
        onClear={handleClear}
        runLabel="Generate Schema"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="schema-output"
          label="JSON Schema Output"
          value={output}
          filename="schema.json"
          mimeType="application/json"
        />
      )}
    </ToolContainer>
  );
}
