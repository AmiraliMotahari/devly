"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolError,
  ToolInput,
  ToolOutput,
  ToolSelect,
} from "@/components/tool-forms";

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

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolContainer>
      <ToolInput
        id="xml-input"
        label="XML Input"
        value={input}
        onChange={setInput}
        placeholder="Paste your XML here..."
        rows={10}
      />

      <ToolSelect
        label="Indent size"
        value={indent}
        onValueChange={(v) => setIndent(v as "2" | "4" | "tab")}
        options={[
          { label: "2 spaces", value: "2" },
          { label: "4 spaces", value: "4" },
          { label: "Tab", value: "tab" },
        ]}
      />

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleFormat}
        onClear={handleClear}
        runLabel="Format"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="xml-output"
          label="Formatted XML"
          value={output}
          filename="formatted.xml"
          mimeType="application/xml"
        />
      )}
    </ToolContainer>
  );
}
