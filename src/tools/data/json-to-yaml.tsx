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
  ToolSelect,
} from "@/components/tool-forms";
import { dump as yamlDump } from "js-yaml";

const INDENT_OPTIONS = [
  { label: "2 spaces", value: "2" },
  { label: "4 spaces", value: "4" },
  { label: "Tab", value: "tab" },
];

export function JsonToYamlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indentSize, setIndentSize] = useState<"2" | "4" | "tab">("2");
  const [pretty, setPretty] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      const indent = parseInt(indentSize, 10);
      setOutput(yamlDump(parsed, { indent, sortKeys: !pretty }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
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
        placeholder='Paste your JSON data here, e.g. {"name":"John","age":30}'
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Indent Size"
          value={indentSize}
          onValueChange={(v) => setIndentSize(v as "2" | "4" | "tab")}
          options={INDENT_OPTIONS}
        />
        <ToolCheckbox
          label="Pretty Print"
          checked={pretty}
          onCheckedChange={setPretty}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleConvert}
        onClear={handleClear}
        runLabel="Convert"
        disabled={!input.trim()}
      />

      {output && (
        <ToolOutput
          id="yaml-output"
          label="YAML Output"
          value={output}
          filename="converted.yaml"
          mimeType="text/yaml"
        />
      )}
    </ToolContainer>
  );
}
