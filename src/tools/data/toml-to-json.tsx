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
import { parse } from "smol-toml";

const PLACEHOLDER = `Paste your TOML data here, e.g.
name = "John"
age = 30
[address]
city = "NYC"`;

export function TomlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some TOML data");
        return;
      }

      const parsed = parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse TOML");
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
        id="toml-input"
        label="TOML Input"
        value={input}
        onChange={setInput}
        placeholder={PLACEHOLDER}
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
          id="json-output"
          label="JSON Output"
          value={output}
          filename="converted.json"
          mimeType="application/json"
        />
      )}
    </ToolContainer>
  );
}
