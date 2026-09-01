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
import { type CsvSeparator, jsonArrayToCsv } from "./lib";

const SEPARATOR_OPTIONS = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "tab" },
  { label: "Pipe", value: "|" },
];

export function JsonToCsvTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<CsvSeparator>(",");
  const [flattenNested, setFlattenNested] = useState(false);
  const [consistentColumns, setConsistentColumns] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed)) {
        setError("Input must be a JSON array of objects");
        return;
      }
      if (parsed.length === 0) {
        setError("JSON array is empty");
        return;
      }

      const csv = jsonArrayToCsv(
        parsed,
        separator,
        flattenNested,
        consistentColumns,
      );
      setOutput(csv);
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
        placeholder='Paste your JSON array here, e.g. [{"name":"Alice","age":30}]'
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
          label="Flatten Nested Objects"
          checked={flattenNested}
          onCheckedChange={setFlattenNested}
        />
        <ToolCheckbox
          label="Consistent Columns"
          checked={consistentColumns}
          onCheckedChange={setConsistentColumns}
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
          id="csv-output"
          label="CSV Output"
          value={output}
          filename="converted.csv"
          mimeType="text/csv"
        />
      )}
    </ToolContainer>
  );
}
