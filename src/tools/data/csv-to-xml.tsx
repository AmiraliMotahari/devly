"use client";

import { useState } from "react";
import Builder from "fast-xml-builder";
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
import { Input } from "@/components/ui/input";
import { type CsvSeparator, csvToArray, normalizeSeparator } from "./lib";

const SEPARATOR_OPTIONS = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "tab" },
  { label: "Pipe", value: "|" },
];

export function CsvToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [separator, setSeparator] = useState<CsvSeparator>(",");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [rootElement, setRootElement] = useState("data");
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

      const xmlOptions = {
        format: true,
        indentBy: "  ",
        suppressEmptyNode: true,
      };

      const xml = new Builder(xmlOptions).build({ [rootElement]: data });
      setOutput(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`);
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
        <div className="flex flex-col gap-2">
          <label htmlFor="root-element" className="text-sm font-medium">
            Root Element Name
          </label>
          <Input
            id="root-element"
            value={rootElement}
            onChange={(e) => setRootElement(e.target.value)}
            className="w-44 font-mono"
          />
        </div>
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
          id="xml-output"
          label="XML Output"
          value={output}
          filename="converted.xml"
          mimeType="application/xml"
        />
      )}
    </ToolContainer>
  );
}
