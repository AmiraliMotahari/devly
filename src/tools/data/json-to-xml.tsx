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
import { Input } from "@/components/ui/input";
import { js2xml } from "xml-js";

const INDENT_OPTIONS = [
  { label: "2 spaces", value: "2" },
  { label: "4 spaces", value: "4" },
];

export function JsonToXmlTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compact, setCompact] = useState(false);
  const [indentSize, setIndentSize] = useState<"2" | "4">("2");
  const [includeDeclaration, setIncludeDeclaration] = useState(true);
  const [rootElement, setRootElement] = useState("root");
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some JSON data");
        return;
      }

      const parsed = JSON.parse(input);
      const wrapped =
        Array.isArray(parsed) || typeof parsed !== "object" || parsed === null
          ? { [rootElement]: parsed }
          : parsed;

      const options: Record<string, unknown> = {
        compact,
        spaces: compact ? 0 : parseInt(indentSize, 10),
        indentText: compact ? false : true,
        textKey: "_text",
        declaration: includeDeclaration ? { encoding: "UTF-8" } : undefined,
      };

      const xml = js2xml(wrapped, options as never);
      setOutput(xml);
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
        placeholder='Paste your JSON data here, e.g. {"name":"John","age":30}'
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Compact (no whitespace)"
          checked={compact}
          onCheckedChange={setCompact}
        />
        {!compact && (
          <ToolSelect
            label="Indent Size"
            value={indentSize}
            onValueChange={(v) => setIndentSize(v as "2" | "4")}
            options={INDENT_OPTIONS}
          />
        )}
        <ToolCheckbox
          label="Include XML Declaration"
          checked={includeDeclaration}
          onCheckedChange={setIncludeDeclaration}
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
