"use client";

import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appName } from "@/lib/constants";
import type { ToolComponentProps } from "@/tools/tool-props";
import { AlertCircle, Play } from "lucide-react";
import { useState } from "react";

export function JsonFormatter({ tool }: ToolComponentProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const indentOption = tool.options?.find((o) => o.key === "indent");
  const indentValue = indentOption ? String(indentOption.default) : "2";
  const indent = indentValue === "tab" ? "\t" : Number(indentValue);

  const format = () => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON.");
      setOutput("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">JSON input</label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`{"name":"${appName}","version":1}`}
          className="min-h-50 font-mono text-sm"
        />
      </div>
      <Button onClick={format} disabled={!input}>
        <Play data-icon="inline-start" /> Format
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Invalid JSON</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {output && !error && (
        <CodeBlock
          code={output}
          language="json"
          filename="formatted.json"
          className="w-full"
          maxHeight="max-h-80 w-full"
        />
      )}
    </div>
  );
}
