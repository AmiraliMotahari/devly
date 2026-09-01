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
import { stringify } from "smol-toml";

export function JsonToTomlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("TOML requires a JSON object (not array or scalar) at the root");
        return;
      }
      setOutput(stringify(parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert JSON");
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
        id="json-input"
        label="JSON Input"
        value={input}
        onChange={setInput}
        placeholder='Paste your JSON object here, e.g. {"name":"John","age":30}'
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
          id="toml-output"
          label="TOML Output"
          value={output}
          filename="converted.toml"
          mimeType="application/toml"
        />
      )}
    </ToolContainer>
  );
}
