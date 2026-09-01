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
import { load as yamlLoad, dump as yamlDump } from "js-yaml";

const INDENT_OPTIONS = [
  { label: "2 spaces", value: "2" },
  { label: "4 spaces", value: "4" },
  { label: "Tab", value: "tab" },
];

export function YamlFormatter({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<"2" | "4" | "tab">("2");
  const [error, setError] = useState("");

  const handleFormat = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some YAML");
        return;
      }

      const parsed = yamlLoad(input);
      const indentSize = parseInt(indent, 10);
      setOutput(yamlDump(parsed, { indent: indentSize }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to format YAML");
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
        placeholder="Paste your YAML here..."
        rows={10}
      />

      <ToolSelect
        label="Indent size"
        value={indent}
        onValueChange={(v) => setIndent(v as "2" | "4" | "tab")}
        options={INDENT_OPTIONS}
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
          id="yaml-output"
          label="Formatted YAML"
          value={output}
          filename="formatted.yaml"
          mimeType="text/yaml"
        />
      )}
    </ToolContainer>
  );
}
