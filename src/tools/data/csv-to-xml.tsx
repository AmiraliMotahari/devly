import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

function csvToArray(text: string, separator: string = ",", hasHeaders: boolean = true) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const sep = separator === "\\t" ? "\t" : separator;
  const rows = lines.map((line) => {
    if (line.includes('"')) {
      return line.split(new RegExp(`(?<!")${sep}(?![^"]*")`, "g")).map((f) =>
        f.replace(/^"|"$/g, "")
      );
    }
    return line.split(sep);
  });

  if (!hasHeaders || rows.length === 0) {
    return rows.map((row) =>
      row.reduce((acc, val, j) => ({ ...acc, [`col${j + 1}`]: val }), {})
    );
  }

  const headers = rows[0].map((h) =>
    h.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "_").toLowerCase()
  );
  return rows.slice(1).map((row) =>
    headers.reduce((acc, header, j) => ({ ...acc, [header]: row[j] ?? "" }), {})
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function arrayToXml(
  data: Record<string, string>[],
  rootElement: string = "data",
  indent: number = 0
): string {
  const spaces = "  ".repeat(indent);
  const itemSpaces = "  ".repeat(indent + 1);
  
  if (data.length === 0) {
    return `${spaces}<${rootElement}/>`;
  }

  const items = data.map((row) => {
    const elements = Object.entries(row)
      .map(([key, value]) => {
        const escapedKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
        const escapedValue = escapeXml(String(value));
        return `${itemSpaces}<${escapedKey}>${escapedValue}</${escapedKey}>`;
      })
      .join("\n");
    return `${itemSpaces}<item>\n${elements}\n${itemSpaces}</item>`;
  });

  return `${spaces}<${rootElement}>\n${items.join("\n")}\n${spaces}</${rootElement}>`;
}

export function CsvToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<"," | ";" | "tab" | "|">(",");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [rootElement, setRootElement] = useState("data");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some CSV data");
        return;
      }

      const sep = separator === "tab" ? "\t" : separator;
      const data = csvToArray(input, sep, hasHeaders);
      if (data.length === 0) {
        setError("No data found");
        return;
      }

      const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
      const xmlBody = arrayToXml(data, rootElement);
      setOutput(`${xmlHeader}\n${xmlBody}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
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
        <label className="block text-sm font-medium mb-2">CSV Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your CSV data here..."
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Separator</label>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value as "," | ";" | "tab" | "|")}
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

        <div>
          <label className="block text-sm font-medium mb-1">Root Element Name</label>
          <input
            type="text"
            value={rootElement}
            onChange={(e) => setRootElement(e.target.value)}
            className="p-2 border rounded"
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
            Download XML
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">XML Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}