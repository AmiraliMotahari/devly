import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { type CsvSeparator, csvToArray, normalizeSeparator } from "./lib";

export function CsvToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<CsvSeparator>(",");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some CSV data");
        return;
      }

      const data = csvToArray(input, normalizeSeparator(separator), hasHeaders);
      if (data.length === 0) {
        setError("No data found");
        return;
      }

      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
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
        <label className="block text-sm font-medium mb-2">CSV Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your CSV data here..."
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Separator</label>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value as CsvSeparator)}
            className="p-2 border rounded"
          >
            <option value=",">Comma</option>
            <option value=";">Semicolon</option>
            <option value="tab">Tab</option>
            <option value="|">Pipe</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
            />
            Has Headers
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
