import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import qs from "qs";

type ArrayFormat = "indices" | "brackets" | "repeat" | "comma";

export function JsonToUrlQueryTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [arrayFormat, setArrayFormat] = useState<ArrayFormat>("brackets");
  const [addPrefix, setAddPrefix] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (parsed === null || typeof parsed !== "object") {
        setError("Input must be a JSON object or array");
        return;
      }

      const result = qs.stringify(parsed, {
        arrayFormat,
        addQueryPrefix: addPrefix,
        encodeValuesOnly: true,
      });
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.txt";
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
          placeholder='Paste a JSON object, e.g. {"name":"John","tags":["a","b"]}'
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
            <option value="brackets">a[0]=x&a[1]=y</option>
            <option value="indices">a[0]=x&a[1]=y (indices)</option>
            <option value="repeat">a=x&a=y</option>
            <option value="comma">a=x,y</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addPrefix}
              onChange={(e) => setAddPrefix(e.target.checked)}
            />
            Add &quot;?&quot; Prefix
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
            Download
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">Query String Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
