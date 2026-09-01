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
import { Input } from "@/components/ui/input";

export function FindAndReplace({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);

  const handleReplace = () => {
    setError("");
    setCount(null);

    if (!input.trim()) {
      setError("Please enter some text");
      return;
    }
    if (!find) {
      setError("Please enter text to find");
      return;
    }

    try {
      if (useRegex) {
        const flags = caseSensitive ? "g" : "gi";
        const regex = new RegExp(find, flags);
        const matches = input.match(regex);
        setCount(matches ? matches.length : 0);
        setOutput(input.replace(regex, replace));
      } else {
        const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flags = caseSensitive ? "g" : "gi";
        const regex = new RegExp(escaped, flags);
        const matches = input.match(regex);
        setCount(matches ? matches.length : 0);
        setOutput(input.replace(regex, replace.replace(/\$\{?(\d+)\}?/g, "$$$1")));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Invalid regular expression: ${err.message}`
          : "Invalid regular expression",
      );
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
    setCount(null);
  };

  return (
    <ToolContainer>
      <ToolInput
        id="fr-input"
        label="Input text"
        value={input}
        onChange={setInput}
        placeholder="Paste your text here..."
        rows={10}
      />

      <ToolRow>
        <div className="flex flex-col gap-2">
          <label htmlFor="fr-find" className="text-sm font-medium">Find</label>
          <Input
            id="fr-find"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={useRegex ? "pattern (regex)" : "text to find"}
            className="w-64 font-mono"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="fr-replace" className="text-sm font-medium">
            Replace with
          </label>
          <Input
            id="fr-replace"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            placeholder="replacement ($1 for groups)"
            className="w-64 font-mono"
          />
        </div>
        <ToolCheckbox
          label="Regex mode"
          checked={useRegex}
          onCheckedChange={setUseRegex}
        />
        <ToolCheckbox
          label="Case sensitive"
          checked={caseSensitive}
          onCheckedChange={setCaseSensitive}
        />
      </ToolRow>

      {error && <ToolError message={error} />}

      <ToolActions
        onRun={handleReplace}
        onClear={handleClear}
        runLabel="Replace all"
        disabled={!input.trim() || !find}
      />

      {count !== null && output !== null && !error && (
        <p className="text-sm text-muted-foreground">
          {count} replacement{count === 1 ? "" : "s"} made
        </p>
      )}

      {output && !error && (
        <ToolOutput
          id="fr-output"
          label="Result"
          value={output}
          filename="replaced.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
