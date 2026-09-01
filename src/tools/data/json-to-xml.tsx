import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import { js2xml } from "xml-js";

export function JsonToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compact, setCompact] = useState(false);
  const [indentSize, setIndentSize] = useState<"2" | "4">("2");
  const [includeDeclaration, setIncludeDeclaration] = useState(true);
  const [rootElement, setRootElement] = useState("root");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      const wrapped =
        Array.isArray(parsed) || typeof parsed !== "object" || parsed === null
          ? { [rootElement]: parsed }
          : parsed;

      const options: Record<string, unknown> = {
        compact,
        spaces: compact ? 0 : parseInt(indentSize, 10),
        indentText: compact ? false : true,
        textKey: "_text",
        declaration: includeDeclaration ? { encoding: "UTF-8" } : undefined,
      };

      const xml = js2xml(wrapped, options as never);
      setOutput(xml);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert JSON");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.xml";
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
            onChange={(e) => setIndentSize(e.target.value as "2" | "4")}
            className="p-2 border rounded"
            disabled={compact}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Root Element</label>
          <input
            type="text"
            value={rootElement}
            onChange={(e) => setRootElement(e.target.value)}
            className="p-2 border rounded font-mono text-sm"
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact
          </label>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDeclaration}
              onChange={(e) => setIncludeDeclaration(e.target.checked)}
            />
            XML Declaration
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
            Download XML
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">XML Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-accent text-accent-foreground">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
