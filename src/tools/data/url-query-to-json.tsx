"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolError,
  ToolInput,
  ToolOutput,
  ToolRow,
  ToolSelect,
} from "@/components/tool-forms";
import { Input } from "@/components/ui/input";
import qs from "qs";

type ArrayFormat = "indices" | "brackets" | "repeat" | "comma";

const ARRAY_FORMAT_OPTIONS = [
  { label: "Brackets (a[]=x)", value: "brackets" },
  { label: "Indices (a[0]=x)", value: "indices" },
  { label: "Repeat (a=x&a=y)", value: "repeat" },
  { label: "Comma (a=x,y)", value: "comma" },
];

export function UrlQueryToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [arrayFormat, setArrayFormat] = useState<ArrayFormat>("brackets");
  const [depth, setDepth] = useState(5);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter a URL query string");
        return;
      }

      const cleaned = input.replace(/^\?/, "");
      const parsed = qs.parse(cleaned, {
        arrayFormat,
        depth,
        ignoreQueryPrefix: false,
      } as Parameters<typeof qs.parse>[1]);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse query string");
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
        id="query-input"
        label="Query String Input"
        value={input}
        onChange={setInput}
        placeholder="Paste a query string, e.g. ?name=John&tags[]=a&tags[]=b"
        rows={10}
      />

      <ToolRow>
        <ToolSelect
          label="Array Format"
          value={arrayFormat}
          onValueChange={(v) => setArrayFormat(v as ArrayFormat)}
          options={ARRAY_FORMAT_OPTIONS}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="depth" className="text-sm font-medium">
            Max Depth
          </label>
          <Input
            id="depth"
            type="number"
            min={1}
            max={10}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-24"
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
