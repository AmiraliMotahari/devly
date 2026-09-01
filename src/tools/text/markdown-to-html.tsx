"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
}

export function MarkdownToHtml({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [includeDocType, setIncludeDocType] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some Markdown text");
        return;
      }

      const lines = input.split("\n");
      const html: string[] = [];
      let inCodeBlock = false;
      let codeBlockLang = "";
      let codeContent: string[] = [];
      let inList = false;
      let listType: "ul" | "ol" = "ul";
      let inTable = false;
      let tableRows: string[][] = [];
      let inBlockquote = false;
      let blockquoteContent: string[] = [];

      const closeList = () => {
        if (inList) {
          html.push(`</${listType}>`);
          inList = false;
        }
      };
      const closeBlockquote = () => {
        if (inBlockquote) {
          html.push(`<blockquote>${blockquoteContent.join("<br/>")}</blockquote>`);
          blockquoteContent = [];
          inBlockquote = false;
        }
      };
      const closeTable = () => {
        if (inTable) {
          if (tableRows.length > 0) {
            html.push("<table>");
            html.push("<thead><tr>");
            for (const cell of tableRows[0]) {
              html.push(`<th>${inlineFormat(cell)}</th>`);
            }
            html.push("</tr></thead>");
            if (tableRows.length > 1) {
              html.push("<tbody>");
              for (let i = 2; i < tableRows.length; i++) {
                html.push("<tr>");
                for (const cell of tableRows[i]) {
                  html.push(`<td>${inlineFormat(cell)}</td>`);
                }
                html.push("</tr>");
              }
              html.push("</tbody>");
            }
            html.push("</table>");
          }
          tableRows = [];
          inTable = false;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("```")) {
          if (inCodeBlock) {
            html.push(
              `<pre><code class="language-${codeBlockLang}">${escapeHtml(codeContent.join("\n"))}</code></pre>`,
            );
            inCodeBlock = false;
            codeBlockLang = "";
            codeContent = [];
          } else {
            closeList();
            closeBlockquote();
            closeTable();
            inCodeBlock = true;
            codeBlockLang = line.slice(3).trim() || "text";
          }
          continue;
        }
        if (inCodeBlock) {
          codeContent.push(line);
          continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          closeList();
          closeBlockquote();
          closeTable();
          const level = headingMatch[1].length;
          const content = inlineFormat(escapeHtml(headingMatch[2]));
          html.push(`<h${level}>${content}</h${level}>`);
          continue;
        }

        if (line.startsWith(">")) {
          closeList();
          closeTable();
          inBlockquote = true;
          blockquoteContent.push(inlineFormat(escapeHtml(line.slice(1).trim())));
          continue;
        } else if (inBlockquote) {
          closeBlockquote();
        }

        if (line.trim() === "") {
          closeList();
          closeBlockquote();
          closeTable();
          continue;
        }

        const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
        if (ulMatch) {
          closeBlockquote();
          closeTable();
          if (!inList || listType !== "ul") {
            closeList();
            html.push("<ul>");
            inList = true;
            listType = "ul";
          }
          html.push(`<li>${inlineFormat(escapeHtml(ulMatch[1]))}</li>`);
          continue;
        }
        const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
        if (olMatch) {
          closeBlockquote();
          closeTable();
          if (!inList || listType !== "ol") {
            closeList();
            html.push("<ol>");
            inList = true;
            listType = "ol";
          }
          html.push(`<li>${inlineFormat(escapeHtml(olMatch[1]))}</li>`);
          continue;
        }
        closeList();

        if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s-:|]+\|?\s*$/.test(lines[i + 1])) {
          closeBlockquote();
          closeTable();
          inTable = true;
          tableRows = [line.split("|").map((c) => c.trim()).filter((c) => c !== "")];
          continue;
        }
        if (inTable) {
          const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "");
          if (cells.length > 0) {
            tableRows.push(cells);
          } else {
            closeTable();
          }
          continue;
        }
        closeTable();

        html.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
      }

      closeList();
      closeBlockquote();
      closeTable();

      let result = html.join("\n");
      if (includeDocType) {
        result = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Converted Document</title>
</head>
<body>
${result}
</body>
</html>`;
      }
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Markdown Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your Markdown here..."
          className="w-full h-48 p-3 border rounded font-mono text-sm"
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDocType}
            onChange={(e) => setIncludeDocType(e.target.checked)}
          />
          Include HTML doctype
        </label>
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
            Download HTML
          </button>
        )}
      </div>

      {output && (
        <div>
          <label className="block text-sm font-medium mb-2">HTML Output</label>
          <pre className="w-full h-48 p-3 border rounded overflow-auto font-mono text-sm bg-gray-50">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}