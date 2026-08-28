import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

type Token = { type: "tag" | "text"; content: string };

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < xml.length) {
    if (xml[pos] === "<") {
      const tagEnd = xml.indexOf(">", pos);
      if (tagEnd === -1) break;
      const tagContent = xml.substring(pos, tagEnd + 1);
      tokens.push({ type: "tag", content: tagContent });
      pos = tagEnd + 1;
    } else {
      const nextTag = xml.indexOf("<", pos);
      const end = nextTag === -1 ? xml.length : nextTag;
      const text = xml.substring(pos, end).trim();
      if (text) tokens.push({ type: "text", content: text });
      pos = end;
    }
  }
  return tokens;
}

export function XmlFormatter({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [error, setError] = useState("");

  const handleFormat = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some XML");
        return;
      }

      const indentStr = indent === "tab" ? "\t" : " ".repeat(parseInt(indent, 10));
      const tokens = tokenize(input);
      const lines: string[] = [];
      let depth = 0;
      const selfClosing = new Set(["br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr"]);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== "tag") continue;

        const content = token.content;
        const isClosing = content.startsWith("</");
        const isSelfClosing = content.endsWith("/>");
        const isDeclaration = content.startsWith("<?") || content.startsWith("<!");

        if (isDeclaration) {
          lines.push(indentStr.repeat(depth) + content);
        } else if (isClosing) {
          depth = Math.max(0, depth - 1);
          lines.push(indentStr.repeat(depth) + content);
        } else {
          lines.push(indentStr.repeat(depth) + content);
          const tagName = content.match(/^<([A-Za-z][A-Za-z0-9_.-]*)/)?.[1] || "";
          if (!isSelfClosing && !selfClosing.has(tagName.toLowerCase())) {
            depth++;
          }
        }
      }

      const result = lines.join("\n");
      const xmlDecl = input.match(/<\?xml[^?]*\?>/i)?.[0] || "";
      setOutput(xmlDecl + (xmlDecl ? "\n" : "") + result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to format XML");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">XML Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your XML here..."
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
          <label className="block text-sm font-medium mb-2">Formatted XML</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
