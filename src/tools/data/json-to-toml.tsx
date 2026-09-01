import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { stringify } from "smol-toml";

export function JsonToTomlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("TOML requires a JSON object (not array or scalar) at the root");
        return;
      }
      setOutput(stringify(parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/toml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.toml";
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
          placeholder='Paste your JSON object here, e.g. {"name":"John","age":30}'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
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
            Download TOML
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">TOML Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
