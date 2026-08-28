import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function yamlToJson(yaml: string): JsonValue {
  const lines = yaml.split(/\r?\n/);
  let index = 0;

  function parseValue(line: string): JsonValue {
    line = line.trim();
    
    if (line.startsWith('"') || line.startsWith("'")) {
      const endQuote = line[0];
      const endQuoteIndex = line.indexOf(endQuote, 1);
      if (endQuoteIndex !== -1) {
        return line.slice(1, endQuoteIndex);
      }
    }

    if (line === "null" || line === "~") return null;
    if (line === "true") return true;
    if (line === "false") return false;

    if (/^-?\d+$/.test(line)) return parseInt(line, 10);
    if (/^-?\d*\.\d+$/.test(line)) return parseFloat(line);

    if (line === "[]") return [];
    if (line === "{}") return {};

    return line;
  }

  function parseBlock(indentation: number = 0): JsonValue {
    const result: Record<string, JsonValue> = {};

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        index++;
        continue;
      }

      const lineIndent = line.search(/\S/);
      if (lineIndent < indentation && indentation > 0) {
        break;
      }

      const isArrayItem = trimmed.startsWith("- ");
      const isKey = trimmed.includes(": ") && !isArrayItem;

      if (isArrayItem) {
        const value = trimmed.slice(2).trim();
        
        if (Array.isArray(result)) {
          (result as unknown[]).push(parseValueWithChildren(value, lineIndent + 2));
        } else if (Object.keys(result).length === 0) {
          index++;
          const arrayResult: JsonValue[] = [];
          arrayResult.push(parseValueWithChildren(value, lineIndent + 2));
          return arrayResult;
        } else {
          (result as unknown[]).push(parseValueWithChildren(value, lineIndent + 2));
        }
        index++;
        continue;
      }

      if (isKey) {
        const colonIndex = trimmed.indexOf(": ");
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 2).trim();

        if (Array.isArray(result)) {
          break;
        }

        if (value === "" || value === "{}") {
          index++;
          const childResult = parseBlock(lineIndent + 2);
          result[key] = childResult || {};
          continue;
        }

        if (value === "[]" || value === "") {
          index++;
          result[key] = [];
          continue;
        }

        result[key] = parseValue(value);
      }

      index++;
    }

    return result;
  }

  function parseValueWithChildren(value: string, childIndent: number): JsonValue {
    if (value === "" || value === "{}") {
      const childResult = parseBlock(childIndent);
      return childResult || {};
    }
    if (value === "[]") return [];
    return parseValue(value);
  }

  return parseBlock(0);
}

export function YamlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [keepComments, setKeepComments] = useState(false);
  const [preserveOrder, setPreserveOrder] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some YAML data");
        return;
      }

      const yaml = keepComments
        ? input
        : input.split(/\r?\n/).filter((line) => !line.trim().startsWith("#")).join("\n");
      
      const json = yamlToJson(yaml);
      setOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse YAML");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
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
          placeholder="Paste your YAML data here, e.g. name: John
age: 30
items:
  - item1
  - item2"
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={keepComments}
              onChange={(e) => setKeepComments(e.target.checked)}
            />
            Keep Comments
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={preserveOrder}
              onChange={(e) => setPreserveOrder(e.target.checked)}
            />
            Preserve Order
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
            Download JSON
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">JSON Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}