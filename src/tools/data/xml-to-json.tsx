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
} from "@/components/tool-forms";
import { xml2js } from "xml-js";

export function XmlToJsonTool({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [compact, setCompact] = useState(true);
  const [keepAttributes, setKeepAttributes] = useState(true);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (!input.trim()) {
        setError("Please enter some XML data");
        return;
      }

      const options = {
        compact,
        ignoreDeclaration: true,
        ignoreAttributes: !keepAttributes,
        textKey: "_text",
        trim: true,
        nativeType: true,
      };

      const result = xml2js(input, options);
      setOutput(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse XML");
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
        id="xml-input"
        label="XML Input"
        value={input}
        onChange={setInput}
        placeholder="Paste your XML data here, e.g. <root><item>value</item></root>"
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Compact Format"
          checked={compact}
          onCheckedChange={setCompact}
        />
        <ToolCheckbox
          label="Keep Attributes"
          checked={keepAttributes}
          onCheckedChange={setKeepAttributes}
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
