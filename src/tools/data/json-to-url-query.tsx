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
import qs from "qs";

type ArrayFormat = "indices" | "brackets" | "repeat" | "comma";

const ARRAY_FORMAT_OPTIONS = [
  { label: "Brackets (a[]=x)", value: "brackets" },
  { label: "Indices (a[0]=x)", value: "indices" },
  { label: "Repeat (a=x&a=y)", value: "repeat" },
  { label: "Comma (a=x,y)", value: "comma" },
];

export function JsonToUrlQueryTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [arrayFormat, setArrayFormat] = useState<ArrayFormat>("brackets");
  const [addPrefix, setAddPrefix] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      if (parsed === null || typeof parsed !== "object") {
        setError("Input must be a JSON object or array");
        return;
      }

      const result = qs.stringify(parsed, {
        arrayFormat,
        addQueryPrefix: addPrefix,
        encodeValuesOnly: true,
      });
      setOutput(result);
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
        placeholder='Paste a JSON object, e.g. {"name":"John","tags":["a","b"]}'
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Array Format"
          value={arrayFormat}
          onValueChange={(v) => setArrayFormat(v as ArrayFormat)}
          options={ARRAY_FORMAT_OPTIONS}
        />
        <ToolCheckbox
          label='Add "?" Prefix'
          checked={addPrefix}
          onCheckedChange={setAddPrefix}
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
          id="query-output"
          label="Query String Output"
          value={output}
          filename="query.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
