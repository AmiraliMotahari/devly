"use client";

import { useState } from "react";
import type { ToolComponentProps } from "@/tools/tool-props";
import {
  ToolActions,
  ToolContainer,
  ToolInput,
} from "@/components/tool-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

function getJsonErrorPosition(input: string, message: string): number | null {
  // V8/SpiderMonkey messages include "position N" or "line X column Y"
  const posMatch = message.match(/position (\d+)/);
  if (posMatch) return Number(posMatch[1]);
  const lineMatch = message.match(/line (\d+) column (\d+)/);
  if (lineMatch) {
    const [, line, col] = lineMatch;
    const lines = input.split("\n");
    let offset = 0;
    for (let i = 0; i < Math.min(Number(line) - 1, lines.length); i++) {
      offset += lines[i].length + 1;
    }
    return offset + Number(col) - 1;
  }
  return null;
}

function formatErrorSnippet(input: string, position: number | null): string {
  if (position === null || position < 0 || position >= input.length) {
    return "";
  }
  const lineStart = input.lastIndexOf("\n", position) + 1;
  const lineEnd = input.indexOf("\n", position);
  const line = input.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  const col = position - lineStart;
  const pointer = " ".repeat(col) + "^";
  return `${line}\n${pointer}`;
}

export function JsonValidator({}: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<
    | { valid: true }
    | { valid: false; message: string; snippet: string }
    | null
  >(null);

  const handleValidate = () => {
    if (!input.trim()) {
      setResult({ valid: false, message: "Please enter some JSON data", snippet: "" });
      return;
    }
    try {
      JSON.parse(input);
      setResult({ valid: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      const position = getJsonErrorPosition(input, message);
      setResult({
        valid: false,
        message,
        snippet: formatErrorSnippet(input, position),
      });
    }
  };

  const handleClear = () => {
    setInput("");
    setResult(null);
  };

  return (
    <ToolContainer>
      <ToolInput
        id="json-input"
        label="JSON Input"
        value={input}
        onChange={setInput}
        placeholder="Paste JSON to validate..."
        rows={10}
      />

      <ToolActions
        onRun={handleValidate}
        onClear={handleClear}
        runLabel="Validate"
        disabled={!input.trim()}
      />

      {result?.valid && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle2 className="size-4 text-success" />
          <AlertDescription className="text-success">
            Valid JSON — parsed successfully.
          </AlertDescription>
        </Alert>
      )}

      {result && !result.valid && (
        <Alert variant="destructive">
          <AlertDescription>
            <p>{result.message}</p>
            {result.snippet && (
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
                {result.snippet}
              </pre>
            )}
          </AlertDescription>
        </Alert>
      )}
    </ToolContainer>
  );
}
