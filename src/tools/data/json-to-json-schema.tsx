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
        placeholder='Paste your JSON data, e.g. {"name":"John","age":30,"email":"john@example.com"}'
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Mark All Properties Required"
          checked={inferRequired}
          onCheckedChange={setInferRequired}
        />
        <ToolCheckbox
          label="Detect String Formats (email, date, uri, uuid, ipv4)"
          checked={detectFormat}
          onCheckedChange={setDetectFormat}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleConvert}
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
