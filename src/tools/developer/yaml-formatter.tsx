import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";

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

      const parsed = yamlLoad(input);
      const indentSize = parseInt(indent, 10);
      setOutput(yamlDump(parsed, { indent: indentSize }));
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