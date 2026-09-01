"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolError,
  ToolInput,
  ToolOutput,
} from "@/components/tool-forms";

function decodeEntities(text: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

function getTextContent(node: Node, depth = 0): string {
  if (node.nodeType === 3) return node.textContent || "";
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map((c) => getTextContent(c, depth + 1)).join("");

  switch (tag) {
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "del":
    case "s":
    case "strike":
      return `~~${children}~~`;
    case "code":
      return `\`${children}\``;
    case "a": {
      const href = el.getAttribute("href") || "";
      if (!href) return children;
      return `[${children}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "";
      return `![${alt}](${src})`;
    }
    case "br":
      return "  \n";
    case "p":
      return `${children}\n\n`;
    case "h1":
      return `# ${children}\n\n`;
    case "h2":
      return `## ${children}\n\n`;
    case "h3":
      return `### ${children}\n\n`;
    case "h4":
      return `#### ${children}\n\n`;
    case "h5":
      return `##### ${children}\n\n`;
    case "h6":
      return `###### ${children}\n\n`;
    case "ul":
      return Array.from(el.children)
        .map((c) => `- ${getTextContent(c, depth + 1).trim()}`)
        .join("\n") + "\n\n";
    case "ol":
      return Array.from(el.children)
        .map((c, i) => `${i + 1}. ${getTextContent(c, depth + 1).trim()}`)
        .join("\n") + "\n\n";
    case "li":
      return `${children}\n`;
    case "blockquote":
      return children
        .split("\n")
        .map((line) => (line.trim() ? `> ${line}` : ""))
        .join("\n") + "\n\n";
    case "pre":
      return `\`\`\`\n${children}\n\`\`\`\n\n`;
    case "hr":
      return "---\n\n";
    case "table": {
      const rows = Array.from(el.querySelectorAll("tr"));
      if (rows.length === 0) return children;
      const cellTexts = rows.map((r) => Array.from(r.querySelectorAll("th,td")).map((c) => getTextContent(c).trim()));
      const headers = cellTexts[0];
      const separator = headers.map(() => "---").join("|");
      const body = cellTexts.slice(1);
      const headerRow = headers.join("|");
      const bodyRows = body.map((row) => row.join("|")).join("\n");
      return `| ${headerRow} |\n|${separator}|\n${bodyRows ? `| ${bodyRows.replace(/\n/g, "\n| ")} |\n` : ""}\n\n`;
    }
    default:
      return children;
  }
}

export function HtmlToMarkdown({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some HTML text");
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(input, "text/html");
      const errEl = doc.querySelector("parsererror");
      if (errEl) throw new Error("Invalid HTML");

      const scripts = doc.querySelectorAll("script, style");
      scripts.forEach((s) => s.remove());

      const body = doc.body || doc.documentElement;
      const text = getTextContent(body).trim();
      const decoded = decodeEntities(text).replace(/\n{3,}/g, "\n\n");
      setOutput(decoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert");
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolContainer>
      <ToolInput
        id="html-input"
        label="HTML Input"
        value={input}
        onChange={setInput}
        placeholder="Paste your HTML here..."
        rows={10}
      />

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleConvert}
        onClear={handleClear}
        runLabel="Convert"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="md-output"
          label="Markdown Output"
          value={output}
          filename="converted.md"
          mimeType="text/markdown"
        />
      )}
    </ToolContainer>
  );
}