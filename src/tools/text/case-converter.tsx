"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ToolComponentProps } from "@/tools/tool-props";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function convertCase(text: string, caseType: string): string {
  switch (caseType) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(
        /\w\S*/g,
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      );
    case "camel":
      return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
    case "pascal": {
      const camel = text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    }
    case "snake":
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    case "kebab":
      return text
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    case "sentence":
      return text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

export function CaseConverter({ tool }: ToolComponentProps) {
  const caseOption = tool.options?.find((o) => o.key === "case");
  const defaultCase = (caseOption?.default as string) ?? "upper";

  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState(defaultCase);
  const [copied, setCopied] = useState(false);

  const output = text ? convertCase(text, caseType) : "";

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Case</label>
        <select
          value={caseType}
          onChange={(e) => setCaseType(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="upper">UPPERCASE</option>
          <option value="lower">lowercase</option>
          <option value="title">Title Case</option>
          <option value="camel">camelCase</option>
          <option value="pascal">PascalCase</option>
          <option value="snake">snake_case</option>
          <option value="kebab">kebab-case</option>
          <option value="sentence">Sentence case</option>
        </select>
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
      {output && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Output</label>
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
