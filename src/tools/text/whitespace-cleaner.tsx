"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function WhitespaceCleaner({ tool }: ToolComponentProps) {
  const getBool = (key: string, fallback: boolean) => {
    const opt = tool.options?.find((o) => o.key === key);
    return opt ? Boolean(opt.default) : fallback;
  };

  const [text, setText] = useState("");
  const [trimLines, setTrimLines] = useState(getBool("trimLines", true));
  const [collapseSpaces, setCollapseSpaces] = useState(
    getBool("collapseSpaces", true),
  );
  const [removeBlankLines, setRemoveBlankLines] = useState(
    getBool("removeBlankLines", false),
  );
  const [copied, setCopied] = useState(false);

  let output = text;
  if (trimLines)
    output = output
      .split("\n")
      .map((l) => l.trim())
      .join("\n");
  if (collapseSpaces) output = output.replace(/[ \t]+/g, " ");
  if (removeBlankLines)
    output = output
      .split("\n")
      .filter((l) => l.trim() !== "")
      .join("\n");
  output = output.replace(/\n{3,}/g, "\n\n");

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <button
            role="switch"
            aria-checked={trimLines}
            onClick={() => setTrimLines(!trimLines)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${trimLines ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${trimLines ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
          Trim each line
        </label>
        <label className="flex items-center gap-2 text-sm">
          <button
            role="switch"
            aria-checked={collapseSpaces}
            onClick={() => setCollapseSpaces(!collapseSpaces)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${collapseSpaces ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${collapseSpaces ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
          Collapse spaces
        </label>
        <label className="flex items-center gap-2 text-sm">
          <button
            role="switch"
            aria-checked={removeBlankLines}
            onClick={() => setRemoveBlankLines(!removeBlankLines)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${removeBlankLines ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${removeBlankLines ? "translate-x-5" : "translate-x-1"}`}
            />
          </button>
          Remove blank lines
        </label>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Input</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="min-h-30"
        />
      </div>
      {output && output !== text && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Cleaned output</label>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea readOnly value={output} className="min-h-30" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
