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
import { load as yamlLoad } from "js-yaml";

const PLACEHOLDER = `Paste your YAML data here, e.g.
name: John
age: 30
items:
  - item1
  - item2`;

export function YamlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some YAML data");
        return;
      }

      const json = yamlLoad(input);
      setOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse YAML");
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
        id="yaml-input"
        label="YAML Input"
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
