import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import qs from "qs";

type ArrayFormat = "indices" | "brackets" | "repeat" | "comma";

export function UrlQueryToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [arrayFormat, setArrayFormat] = useState<ArrayFormat>("brackets");
  const [depth, setDepth] = useState(5);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter a URL query string");
        return;
      }

      const cleaned = input.replace(/^\?/, "");
      const parsed = qs.parse(cleaned, {
        arrayFormat,
        depth,
        ignoreQueryPrefix: false,
      } as Parameters<typeof qs.parse>[1]);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse query string");
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
        <label className="block text-sm font-medium mb-2">Query String Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a query string, e.g. ?name=John&tags[]=a&tags[]=b"
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Array Format</label>
          <select
            value={arrayFormat}
            onChange={(e) => setArrayFormat(e.target.value as ArrayFormat)}
            className="p-2 border rounded"
          >
            <option value="brackets">a[]=x&a[]=y</option>
            <option value="indices">a[0]=x&a[1]=y</option>
            <option value="repeat">a=x&a=y</option>
            <option value="comma">a=x,y</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Depth</label>
          <input
            type="number"
            min={1}
            max={10}
            value={depth}
            onChange={(e) => setDepth(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            className="w-20 p-2 border rounded"
          />
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
