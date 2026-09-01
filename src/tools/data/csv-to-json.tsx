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
import { type CsvSeparator, csvToArray, normalizeSeparator } from "./lib";

const SEPARATOR_OPTIONS = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "tab" },
  { label: "Pipe", value: "|" },
];

export function CsvToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<CsvSeparator>(",");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some CSV data");
        return;
      }

      const data = csvToArray(input, normalizeSeparator(separator), hasHeaders);
      if (data.length === 0) {
        setError("No data found");
        return;
      }

      setOutput(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
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
        id="csv-input"
        label="CSV Input"
        value={input}
        onChange={setInput}
        placeholder="Paste your CSV data here..."
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Separator"
          value={separator}
          onValueChange={(v) => setSeparator(v as CsvSeparator)}
          options={SEPARATOR_OPTIONS}
        />
        <ToolCheckbox
          label="Has Headers"
          checked={hasHeaders}
          onCheckedChange={setHasHeaders}
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
