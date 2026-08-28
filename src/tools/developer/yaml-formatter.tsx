import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function jsonToYaml(value: JsonValue, indent: number = 0, indentSize: number | string = 2): string {
  const indentStr = typeof indentSize === "number" ? " ".repeat(indentSize) : "\t";
  const currentIndent = indentStr.repeat(indent);

  if (value === null || value === undefined) return "null";
  if (typeof value === "string") {
    if (value.includes("\n") || value.includes(":") || value.includes("#") ||
        value.startsWith("-") || value.startsWith("[") || value.startsWith("{")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => `${currentIndent}- ${jsonToYaml(item, indent + 1, indentSize)}`)
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, val]) => {
        const yamlValue = jsonToYaml(val, indent + 1, indentSize);
        return `${currentIndent}${key}: ${yamlValue}`;
      })
      .join("\n");
  }
  return String(value);
}

function parseSimpleYaml(yaml: string): JsonValue {
  const lines = yaml.split(/\r?\n/).filter((l) => !l.trim().startsWith("#"));
  const result: Record<string, JsonValue> = {};
  let currentKey: string | null = null;
  let currentArray: JsonValue[] = [];
  let currentIndent = 0;
  let arrayKey: string | null = null;

  function parseValue(val: string): JsonValue {
    val = val.trim();
    if (!val || val === "~") return null;
    if (val === "true") return true;
    if (val === "false") return false;
    if (/^-?\d+$/.test(val)) return parseInt(val, 10);
    if (/^-?\d*\.\d+$/.test(val)) return parseFloat(val);
    if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1).replace(/\\"/g, '"');
    if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
    if (val === "[]") return [];
    if (val === "{}") return {};
    return val;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("- ")) {
      if (arrayKey) {
        currentArray.push(parseValue(trimmed.slice(2)));
      }
      continue;
    }

    if (currentKey && arrayKey) {
      result[arrayKey] = currentArray;
      currentArray = [];
      arrayKey = null;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (value) {
      result[key] = parseValue(value);
    } else {
      currentKey = key;
      currentIndent = line.search(/\S/);
      arrayKey = key;
    }
  }

  if (arrayKey && currentKey) {
    result[arrayKey] = currentArray;
  }

  return result;
}

export function YamlFormatter({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [error, setError] = useState("");

  const handleFormat = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some YAML");
        return;
      }

      const parsed = parseSimpleYaml(input);
      setOutput(jsonToYaml(parsed, 0, indent));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to format YAML");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">YAML Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your YAML here..."
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Indent size</label>
        <select
          value={indent}
          onChange={(e) => setIndent(e.target.value as "2" | "4" | "tab")}
          className="p-2 border rounded"
        >
          <option value="2">2 spaces</option>
          <option value="4">4 spaces</option>
          <option value="tab">Tab</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleFormat}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Format
        </button>
        {output && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">Formatted YAML</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
