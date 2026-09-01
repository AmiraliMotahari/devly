"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

export function HtmlMinifier({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [removeComments, setRemoveComments] = useState(true);
  const [collapseWhitespace, setCollapseWhitespace] = useState(true);
  const [error, setError] = useState("");
  const [savings, setSavings] = useState({ original: 0, minified: 0 });

  const handleMinify = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some HTML");
        return;
      }

      let result = input;
      const originalSize = input.length;

      if (removeComments) {
        result = result.replace(/<!--[\s\S]*?-->/g, "");
      }

      if (collapseWhitespace) {
        result = result
          .replace(/\s+/g, " ")
          .replace(/>\s+</g, "><")
          .trim();
      }

      result = result.replace(/\s+\/>/g, "/>");

      setOutput(result);
      setSavings({ original: originalSize, minified: result.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to minify");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minified.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const percent = savings.original
    ? Math.round(((savings.original - savings.minified) / savings.original) * 100)
    : 0;

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">HTML Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your HTML here..."
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={removeComments}
            onChange={(e) => setRemoveComments(e.target.checked)}
          />
          Remove comments
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={collapseWhitespace}
            onChange={(e) => setCollapseWhitespace(e.target.checked)}
          />
          Collapse whitespace
        </label>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleMinify}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Minify
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
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-medium">HTML Output</span>
            <span className="text-muted-foreground">
              {savings.original} → {savings.minified} bytes ({percent}% smaller)
            </span>
          </div>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}