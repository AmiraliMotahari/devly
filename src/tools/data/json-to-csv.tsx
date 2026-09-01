import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { type CsvSeparator, jsonArrayToCsv } from "./lib";

export function JsonToCsvTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<CsvSeparator>(",");
  const [flattenNested, setFlattenNested] = useState(false);
  const [consistentColumns, setConsistentColumns] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array of objects");
        return;
      }
      if (parsed.length === 0) {
        setError("JSON array is empty");
        return;
      }

      const csv = jsonArrayToCsv(
        parsed,
        separator,
        flattenNested,
        consistentColumns,
      );
      setOutput(csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.csv";
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
          placeholder='Paste your JSON array here, e.g. [{"name":"Alice","age":30}]'
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
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
              checked={flattenNested}
              onChange={(e) => setFlattenNested(e.target.checked)}
            />
            Flatten Nested Objects
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={consistentColumns}
              onChange={(e) => setConsistentColumns(e.target.checked)}
            />
            Consistent Columns
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
            Download CSV
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">CSV Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-accent text-accent-foreground">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
