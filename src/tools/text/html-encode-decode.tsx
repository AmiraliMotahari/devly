"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolInput,
  ToolOutput,
} from "@/components/tool-forms";

export function HtmlEncodeDecode({}: ToolComponentProps) {
  const [input, setInput] = useState("");

  // Encode: & < > " ' — same set the markdown-to-html escapeHtml uses
  const encoded = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  // Decode: named + numeric entities via DOMParser (safe, no innerHTML eval)
  const decode = (text: string): string => {
    if (!text.includes("&")) return text;
    const doc = new DOMParser().parseFromString(
      `<t>${text}</t>`,
      "text/html",
    );
    return doc.querySelector("t")?.textContent ?? text;
  };

  return (
    <ToolContainer>
      <ToolInput
        id="he-input"
        label="Input"
        value={input}
        onChange={setInput}
        placeholder="Paste text or HTML entities (e.g. &lt;div&gt; or <div>)"
        rows={8}
      />

      <ToolActions
        onRun={() => {}}
        onClear={() => setInput("")}
        runLabel="—"
        disabled
      />

      {input && (
        <>
          <ToolOutput
            id="he-encoded"
            label="Encoded (HTML entities)"
            value={encoded}
            filename="encoded.txt"
            mimeType="text/plain"
          />
          <ToolOutput
            id="he-decoded"
            label="Decoded (plain text)"
            value={decode(input)}
            filename="decoded.txt"
            mimeType="text/plain"
          />
        </>
      )}
    </ToolContainer>
  );
}
