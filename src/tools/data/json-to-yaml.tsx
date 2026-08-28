import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function jsonToYaml(value: JsonValue, indent: number = 0, indentSize: number | string = 2): string {
  const indentStr = typeof indentSize === "number" ? " ".repeat(indentSize) : "\t";
  const currentIndent = indentStr.repeat(indent);

  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    if (value.includes("\n") || value.includes(":") || value.includes("#") || 
        value.startsWith("-") || value.startsWith("[") || value.startsWith("{")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

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

export function JsonToYamlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indentSize, setIndentSize] = useState<"2" | "4" | "tab">("2");
  const [pretty, setPretty] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed: JsonValue = JSON.parse(input);
      setOutput(jsonToYaml(parsed, 0, indentSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.yaml";
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
          placeholder='Paste your JSON data here, e.g. {"name":"John","age":30}'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Indent Size</label>
          <select
            value={indentSize}
            onChange={(e) => setIndentSize(e.target.value as "2" | "4" | "tab")}
            className="p-2 border rounded"
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
            />
            Pretty Print
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleConvert}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Convert
        </button>
        {output && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download YAML
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">YAML Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}