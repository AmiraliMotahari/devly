"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolCheckbox,
  ToolContainer,
  ToolInput,
  ToolOutput,
  ToolRow,
} from "@/components/tool-forms";

export function RemoveDuplicateLines({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<{ removed: number; kept: number } | null>(null);

  const handleRemove = () => {
    let lines = input.split("\n");
    if (trimWhitespace) {
      lines = lines.map((l) => l.trim());
    }
    const seen = new Set<string>();
    const result: string[] = [];
    let removed = 0;

    for (const line of lines) {
      const key = caseInsensitive ? line.toLowerCase() : line;
      if (seen.has(key)) {
        removed++;
      } else {
        seen.add(key);
        result.push(line);
      }
    }

    setOutput(result.join("\n"));
    setStats({ removed, kept: result.length });
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setStats(null);
  };

  return (
    <ToolContainer>
      <ToolInput
        id="dedupe-input"
        label="Input"
        value={input}
        onChange={setInput}
        placeholder="Paste lines with duplicates..."
        rows={10}
      />

      <ToolRow>
        <ToolCheckbox
          label="Ignore case"
          checked={caseInsensitive}
          onCheckedChange={setCaseInsensitive}
        />
        <ToolCheckbox
          label="Trim whitespace before comparing"
          checked={trimWhitespace}
          onCheckedChange={setTrimWhitespace}
        />
      </ToolRow>

      <ToolActions
        onRun={handleRemove}
        onClear={handleClear}
        runLabel="Remove duplicates"
        disabled={!input.trim()}
      />

      {stats && (
        <p className="text-sm text-muted-foreground">
          Removed {stats.removed} duplicate line{stats.removed === 1 ? "" : "s"} ·{" "}
          {stats.kept} unique line{stats.kept === 1 ? "" : "s"} kept
        </p>
      )}

      {output && (
        <ToolOutput
          id="dedupe-output"
          label="Unique lines"
          value={output}
          filename="unique.txt"
          mimeType="text/plain"
        />
      )}
    </ToolContainer>
  );
}
