"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolCheckbox,
  ToolContainer,
  ToolError,
  ToolInput,
  ToolOutput,
  ToolRow,
} from "@/components/tool-forms";

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
        result = result.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
      }

      result = result.replace(/\s+\/>/g, "/>");

      setOutput(result);
      setSavings({ original: originalSize, minified: result.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to minify");
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
    setSavings({ original: 0, minified: 0 });
  };

  const percent = savings.original
    ? Math.round(
        ((savings.original - savings.minified) / savings.original) * 100,
      )
    : 0;

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

      <ToolRow>
        <ToolCheckbox
          label="Remove comments"
          checked={removeComments}
          onCheckedChange={setRemoveComments}
        />
        <ToolCheckbox
          label="Collapse whitespace"
          checked={collapseWhitespace}
          onCheckedChange={setCollapseWhitespace}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleMinify}
        onClear={handleClear}
        runLabel="Minify"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="minified-output"
          label="HTML Output"
          value={output}
          filename="minified.html"
          mimeType="text/html"
        />
      )}

      {output && savings.original > 0 && (
        <p className="text-sm text-muted-foreground">
          {savings.original} → {savings.minified} bytes ({percent}% smaller)
        </p>
      )}
    </ToolContainer>
  );
}
