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
import { js2xml } from "xml-js";

const INDENT_OPTIONS = [
  { label: "2 spaces", value: "2" },
  { label: "4 spaces", value: "4" },
];

/**
 * Convert a parsed JSON value into xml-js's *compact* representation:
 * strings/numbers become _text, arrays repeat elements, nested objects nest.
 * Without this mapping, js2xml on plain objects returns an empty string.
 */
function toCompactXml(value: unknown, key: string): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { [key]: { _text: "" } };
  }

  if (Array.isArray(value)) {
    return {
      [key]: value.map((item) => toCompactXmlValue(item)),
    };
  }

  if (typeof value === "object") {
    const inner: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      Object.assign(inner, toCompactXml(childValue, childKey));
    }
    return { [key]: inner };
  }

  return { [key]: { _text: String(value) } };
}

/** Array items: each entry becomes its own element via its own key. */
function toCompactXmlValue(value: unknown): Record<string, unknown> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    const inner: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      Object.assign(inner, toCompactXml(childValue, childKey));
    }
    return inner;
  }
  return { _text: String(value) };
}

export function JsonToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compact, setCompact] = useState(false);
  const [indentSize, setIndentSize] = useState<"2" | "4">("2");
  const [includeDeclaration, setIncludeDeclaration] = useState(true);
  const [rootElement, setRootElement] = useState("root");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed: unknown = JSON.parse(input);
      const needsWrapper =
        Array.isArray(parsed) || typeof parsed !== "object" || parsed === null;
      const root = needsWrapper
        ? { [rootElement || "root"]: parsed }
        : (parsed as Record<string, unknown>);

      const compactRep: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(root)) {
        Object.assign(compactRep, toCompactXml(value, key));
      }

      const xml = js2xml(compactRep, {
        compact: true,
        spaces: compact ? 0 : parseInt(indentSize, 10),
      });

      if (typeof xml !== "string" || xml.length === 0) {
        throw new Error("Conversion produced empty XML — check your input");
      }

      setOutput(
        includeDeclaration
          ? `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`
          : xml,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert JSON");
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
        placeholder='Paste your JSON data here, e.g. {"name":"John","age":30}'
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Compact (no whitespace)"
          checked={compact}
          onCheckedChange={setCompact}
        />
        {!compact && (
          <ToolSelect
            label="Indent Size"
            value={indentSize}
            onValueChange={(v) => setIndentSize(v as "2" | "4")}
            options={INDENT_OPTIONS}
          />
        )}
        <ToolCheckbox
          label="Include XML Declaration"
          checked={includeDeclaration}
          onCheckedChange={setIncludeDeclaration}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="root-element" className="text-sm font-medium">
            Root Element Name
          </label>
          <Input
            id="root-element"
            value={rootElement}
            onChange={(e) => setRootElement(e.target.value)}
            className="w-44 font-mono"
          />
        </div>
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleConvert}
        onClear={handleClear}
        runLabel="Convert"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="xml-output"
          label="XML Output"
          value={output}
          filename="converted.xml"
          mimeType="application/xml"
        />
      )}
    </ToolContainer>
  );
}
