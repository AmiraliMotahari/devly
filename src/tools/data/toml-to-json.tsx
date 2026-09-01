import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { parse } from "smol-toml";

export function TomlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some TOML data");
        return;
      }

      const parsed = parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse TOML");
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
        <label className="block text-sm font-medium mb-2">TOML Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste your TOML data here, e.g.\nname = "John"\nage = 30\n[address]\ncity = "NYC"`}
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
